#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const testDatabaseUrl = process.env.HAYDEV_TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) {
  throw new Error("HAYDEV_TEST_DATABASE_URL is required; production DATABASE_URL is never used for mutation tests");
}
if (process.env.HAYDEV_TEST_DATABASE_CONFIRM !== "HAYDEVOS_ISOLATED_TEST_DATABASE") {
  throw new Error("HAYDEV_TEST_DATABASE_CONFIRM=HAYDEVOS_ISOLATED_TEST_DATABASE is required");
}

function databaseIdentity(value) {
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("HAYDEV_TEST_DATABASE_URL must be PostgreSQL");
  }
  return [url.hostname.toLowerCase(), url.port || "5432", decodeURIComponent(url.username), url.pathname].join("|");
}

function localProductionUrls() {
  const file = path.join(root, ".env");
  if (!existsSync(file)) return [];
  const values = [];
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(DATABASE_URL|DIRECT_URL)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const unquoted = match[2].replace(/^(?:"(.*)"|'(.*)')$/, (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted ?? "");
    if (unquoted) values.push(unquoted);
  }
  return values;
}

const testIdentity = databaseIdentity(testDatabaseUrl);
for (const productionUrl of localProductionUrls()) {
  if (databaseIdentity(productionUrl) === testIdentity) {
    throw new Error("HAYDEV_TEST_DATABASE_URL matches the local production database; refusing mutation tests");
  }
}

const testFiles = [
  "tests/owner-ai-fail-closed.test.ts",
  "tests/session-null-org.test.ts",
  "tests/login-throttle.test.ts",
  "tests/document-archive-download.test.ts",
];
const childEnvironment = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: testDatabaseUrl,
  DIRECT_URL: testDatabaseUrl,
};

for (const testFile of testFiles) {
  const result = spawnSync("bun", ["test", testFile], {
    cwd: root,
    env: childEnvironment,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
