#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { StorageClient } from "@supabase/storage-js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

if (process.env.RESTORE_CONFIRM_ISOLATED !== "HAYDEVOS_RESTORE_DRILL") {
  throw new Error("RESTORE_CONFIRM_ISOLATED=HAYDEVOS_RESTORE_DRILL is required");
}
const manifestPath = resolve(required("BACKUP_MANIFEST"));
const root = dirname(manifestPath);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.schemaVersion !== 1) throw new Error("Unsupported backup manifest schema");

const dumpPath = join(root, manifest.database.file);
const dumpBytes = await readFile(dumpPath);
const dumpHash = createHash("sha256").update(dumpBytes).digest("hex");
if (dumpHash !== manifest.database.sha256) throw new Error("Database backup hash mismatch");

const restoreUrl = new URL(required("RESTORE_DATABASE_URL"));
const restoreDatabase = restoreUrl.pathname.replace(/^\//, "");
if (!["postgres:", "postgresql:"].includes(restoreUrl.protocol) || !/restore|drill/i.test(restoreDatabase)) {
  throw new Error("RESTORE_DATABASE_URL must target an explicitly named restore/drill database");
}
for (const liveName of ["DATABASE_URL", "DIRECT_URL"]) {
  if (process.env[liveName]) {
    const live = new URL(process.env[liveName]);
    if (live.hostname === restoreUrl.hostname && live.pathname === restoreUrl.pathname) {
      throw new Error("Restore target matches a live database; aborting");
    }
  }
}
const databaseArgs = [
  "--host", restoreUrl.hostname,
  "--port", restoreUrl.port || "5432",
  "--username", decodeURIComponent(restoreUrl.username),
  "--dbname", restoreDatabase,
];
const databaseEnv = { ...process.env, PGPASSWORD: decodeURIComponent(restoreUrl.password), PGSSLMODE: "require" };
const restored = spawnSync("pg_restore", [
  ...databaseArgs,
  "--clean", "--if-exists", "--no-owner", "--no-privileges", "--exit-on-error", dumpPath,
], { stdio: "inherit", env: databaseEnv });
if (restored.status !== 0) throw new Error(`pg_restore failed with exit code ${restored.status}`);

const validationSql = [
  "SELECT count(*) AS applied_migrations FROM \"_prisma_migrations\" WHERE finished_at IS NOT NULL;",
  "SELECT count(*) AS organizations FROM \"Organization\";",
  "SELECT count(*) AS documents FROM \"DocumentRecord\";",
  "SELECT count(*) AS inventory_movements FROM \"InventoryMovement\";",
].join(" ");
const validated = spawnSync("psql", [...databaseArgs, "--set", "ON_ERROR_STOP=1", "--command", validationSql], {
  stdio: "inherit", env: databaseEnv,
});
if (validated.status !== 0) throw new Error(`Restore validation failed with exit code ${validated.status}`);

const supabaseUrl = required("SUPABASE_URL").replace(/\/$/, "");
const secret = required("SUPABASE_SECRET_KEY");
if (!secret.startsWith("sb_secret_")) throw new Error("Storage restore drill requires the modern sb_secret key");
const restoreBucket = required("HAYDEV_RESTORE_BUCKET");
if (!/restore|drill/i.test(restoreBucket)) throw new Error("HAYDEV_RESTORE_BUCKET must be an isolated restore/drill bucket");
const storage = new StorageClient(`${supabaseUrl}/storage/v1`, { apikey: secret, "X-Client-Info": "haydevos-restore-drill/1.0" });
const prefix = `restore-drill/${Date.now()}`;
const uploaded = [];
try {
  for (const object of manifest.storage.objects) {
    const bytes = await readFile(join(root, "storage-objects", object.localName));
    if (createHash("sha256").update(bytes).digest("hex") !== object.sha256) throw new Error("Storage backup hash mismatch");
    const key = `${prefix}/${object.key}`;
    const put = await storage.from(restoreBucket).upload(key, bytes, { upsert: false, contentType: "application/octet-stream" });
    if (put.error) throw new Error(`Storage restore failed: ${put.error.name ?? "StorageError"}`);
    uploaded.push(key);
    const downloaded = await storage.from(restoreBucket).download(key);
    if (downloaded.error) throw new Error(`Storage verification download failed: ${downloaded.error.name ?? "StorageError"}`);
    const restoredBytes = Buffer.from(await downloaded.data.arrayBuffer());
    if (createHash("sha256").update(restoredBytes).digest("hex") !== object.sha256) throw new Error("Restored Storage hash mismatch");
  }
} finally {
  for (let offset = 0; offset < uploaded.length; offset += 100) {
    await storage.from(restoreBucket).remove(uploaded.slice(offset, offset + 100));
  }
}
console.log(`Restore drill PASS: database restored and ${uploaded.length} Storage objects verified by SHA-256.`);
