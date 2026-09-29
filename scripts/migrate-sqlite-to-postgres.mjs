#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const prismaDir = join(rootDir, "prisma");
const mainSchemaPath = join(prismaDir, "schema.prisma");
const sourceSchemaPath = join(prismaDir, ".sqlite-source.generated.prisma");
const sourceClientDir = join(rootDir, "node_modules", ".haydev-sqlite-client");
const prismaCliPath = join(rootDir, "node_modules", "prisma", "build", "index.js");
const batchSize = 500;

const tables = [
  { model: "User", delegate: "user", key: "id" },
  { model: "Organization", delegate: "organization", key: "id" },
  { model: "Membership", delegate: "membership", key: "id" },
  { model: "Session", delegate: "session", key: "id" },
  { model: "AuthThrottle", delegate: "authThrottle", key: "key" },
  { model: "AuditLog", delegate: "auditLog", key: "id" },
  { model: "Notification", delegate: "notification", key: "id" },
  { model: "ModuleRegistry", delegate: "moduleRegistry", key: "id" },
  { model: "Lead", delegate: "lead", key: "id" },
  { model: "LeadActivity", delegate: "leadActivity", key: "id" },
  { model: "Task", delegate: "task", key: "id" },
  { model: "Customer", delegate: "customer", key: "id" },
  { model: "Quote", delegate: "quote", key: "id" },
  { model: "QuoteItem", delegate: "quoteItem", key: "id" },
  { model: "Product", delegate: "product", key: "id" },
  { model: "PriceBook", delegate: "priceBook", key: "id" },
  { model: "DocumentRecord", delegate: "documentRecord", key: "id" },
  { model: "DocumentField", delegate: "documentField", key: "id" },
  { model: "Automation", delegate: "automation", key: "id" },
  { model: "AutomationRun", delegate: "automationRun", key: "id" },
  { model: "Order", delegate: "order", key: "id" },
  { model: "Invoice", delegate: "invoice", key: "id" },
  { model: "Payment", delegate: "payment", key: "id" },
  { model: "Integration", delegate: "integration", key: "id" },
  { model: "WebhookEvent", delegate: "webhookEvent", key: "id" },
  { model: "AuditQuestionnaire", delegate: "auditQuestionnaire", key: "id" },
  { model: "AiConversation", delegate: "aiConversation", key: "id" },
  { model: "AiMessage", delegate: "aiMessage", key: "id" },
];

function loadLocalEnv() {
  const envPath = join(rootDir, ".env");
  if (!existsSync(envPath)) return;

  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function fail(message) {
  throw new Error(message);
}

function redactConnection(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.username || "<user>"}:***@${parsed.host}${parsed.pathname}`;
  } catch {
    return "<invalid connection URL>";
  }
}

function resolveSqlitePath(sourceUrl) {
  if (!sourceUrl.startsWith("file:")) {
    fail("SQLITE_SOURCE_URL must be a file: URL.");
  }

  const rawPath = decodeURIComponent(sourceUrl.slice("file:".length).split("?")[0]);
  const normalized = rawPath.replaceAll("/", process.platform === "win32" ? "\\" : "/");
  return isAbsolute(normalized) ? normalized : resolve(prismaDir, normalized);
}

function buildSqliteSchema(postgresSchema) {
  return postgresSchema
    .replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output   = "../node_modules/.haydev-sqlite-client"')
    .replace('provider  = "postgresql"', 'provider = "sqlite"')
    .replace(/^\s*directUrl\s*=.*$/m, "")
    .replace(/\s+@db\.Timestamptz\(3\)/g, "")
    .replace(/\s+@db\.Decimal\(19, 4\)/g, "")
    .replace(/\bDecimal\b/g, "Float");
}

function runPrismaGenerate(schemaPath, databaseUrl, directUrl) {
  execFileSync(process.execPath, [prismaCliPath, "generate", "--schema", schemaPath], {
    cwd: rootDir,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DIRECT_URL: directUrl,
    },
    stdio: "inherit",
  });
}

function normalizeValue(value) {
  if (value === null || value === undefined) return value ?? null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("Source contains a non-finite numeric value.");
    return value.toString();
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object" && value.constructor?.name === "Decimal") {
    return value.toString();
  }
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, normalizeValue(nested)]),
    );
  }
  return value;
}

function canonicalRow(row) {
  return JSON.stringify(normalizeValue(row));
}

async function digestTable(client, table) {
  const hash = createHash("sha256");
  let offset = 0;
  let count = 0;
  let firstKeyHash = null;
  let lastKeyHash = null;

  while (true) {
    const rows = await client[table.delegate].findMany({
      orderBy: { [table.key]: "asc" },
      skip: offset,
      take: batchSize,
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      const keyHash = createHash("sha256")
        .update(String(row[table.key]))
        .digest("hex")
        .slice(0, 12);
      firstKeyHash ??= keyHash;
      lastKeyHash = keyHash;
      hash.update(canonicalRow(row));
      hash.update("\n");
      count += 1;
    }
    offset += rows.length;
  }

  return {
    count,
    digest: hash.digest("hex"),
    firstKeyHash,
    lastKeyHash,
  };
}

async function inspectCounts(client) {
  const counts = {};
  for (const table of tables) {
    counts[table.model] = await client[table.delegate].count();
  }
  return counts;
}

async function copyTables(source, target) {
  for (const table of tables) {
    const total = await source[table.delegate].count();
    let copied = 0;

    while (copied < total) {
      const rows = await source[table.delegate].findMany({
        orderBy: { [table.key]: "asc" },
        skip: copied,
        take: batchSize,
      });
      if (rows.length === 0) break;

      await target[table.delegate].createMany({ data: rows });
      copied += rows.length;
    }

    console.log(`COPY ${table.model}: ${copied}/${total}`);
  }
}

async function verifyTables(source, target) {
  let failed = false;
  const report = [];

  for (const table of tables) {
    const [sourceResult, targetResult] = await Promise.all([
      digestTable(source, table),
      digestTable(target, table),
    ]);
    const passed =
      sourceResult.count === targetResult.count &&
      sourceResult.digest === targetResult.digest;
    failed ||= !passed;
    report.push({
      table: table.model,
      status: passed ? "PASS" : "FAIL",
      rows: `${sourceResult.count}/${targetResult.count}`,
      digest: sourceResult.digest.slice(0, 16),
      first: sourceResult.firstKeyHash ?? "-",
      last: sourceResult.lastKeyHash ?? "-",
    });
  }

  console.table(report);
  if (failed) fail("SQLite/PostgreSQL verification failed.");
}

loadLocalEnv();

const verifyOnly = process.argv.includes("--verify-only");
const sourceUrl =
  process.env.SQLITE_SOURCE_URL ||
  "file:../db/custom.db.before-supabase-20260925";
const targetUrl = process.env.DIRECT_URL;

if (!targetUrl || !/^postgres(?:ql)?:\/\//i.test(targetUrl)) {
  fail("DIRECT_URL must be a PostgreSQL session/direct connection URL.");
}

const sourcePath = resolveSqlitePath(sourceUrl);
if (!existsSync(sourcePath)) {
  fail(`SQLite source does not exist: ${sourcePath}`);
}

console.log(`Source SQLite: ${sourcePath}`);
console.log(`Target PostgreSQL: ${redactConnection(targetUrl)}`);
console.log(`Mode: ${verifyOnly ? "verify only" : "copy then verify"}`);

runPrismaGenerate(mainSchemaPath, targetUrl, targetUrl);
writeFileSync(
  sourceSchemaPath,
  buildSqliteSchema(readFileSync(mainSchemaPath, "utf8")),
  "utf8",
);

try {
  runPrismaGenerate(sourceSchemaPath, sourceUrl, targetUrl);
} finally {
  if (existsSync(sourceSchemaPath)) unlinkSync(sourceSchemaPath);
}

const [{ PrismaClient: TargetClient }, { PrismaClient: SourceClient }] =
  await Promise.all([
    import("@prisma/client"),
    import(pathToFileURL(join(sourceClientDir, "index.js")).href),
  ]);

const source = new SourceClient({ datasources: { db: { url: sourceUrl } } });
const target = new TargetClient({ datasources: { db: { url: targetUrl } } });

try {
  await Promise.all([source.$connect(), target.$connect()]);

  if (!verifyOnly) {
    const targetCounts = await inspectCounts(target);
    const populated = Object.entries(targetCounts).filter(([, count]) => count > 0);
    if (populated.length > 0) {
      fail(
        `Target application tables are not empty (${populated
          .map(([table, count]) => `${table}=${count}`)
          .join(", ")}). Refusing a merge; use a fresh target or --verify-only.`,
      );
    }
    await copyTables(source, target);
  }

  await verifyTables(source, target);
  console.log("PASS: all table counts and row digests match.");
} finally {
  await Promise.allSettled([source.$disconnect(), target.$disconnect()]);
}
