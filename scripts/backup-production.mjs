#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { StorageClient } from "@supabase/storage-js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const repository = resolve(import.meta.dirname, "..");
const backupRoot = resolve(required("BACKUP_DIR"));
const fromRepository = relative(repository, backupRoot);
if (!isAbsolute(backupRoot) || fromRepository === "" || (!fromRepository.startsWith("..") && !isAbsolute(fromRepository))) {
  throw new Error("BACKUP_DIR must be an absolute directory outside the repository");
}
if (process.env.BACKUP_DESTINATION_CONFIRMED_ENCRYPTED !== "YES") {
  throw new Error("BACKUP_DESTINATION_CONFIRMED_ENCRYPTED=YES is required");
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const destination = join(backupRoot, `haydevos-${timestamp}`);
const objectDirectory = join(destination, "storage-objects");
await mkdir(objectDirectory, { recursive: true, mode: 0o700 });

const directUrl = new URL(required("DIRECT_URL"));
if (!["postgres:", "postgresql:"].includes(directUrl.protocol)) throw new Error("DIRECT_URL must be PostgreSQL");
const databaseFile = join(destination, "database.dump");
const dump = spawnSync("pg_dump", [
  "--host", directUrl.hostname,
  "--port", directUrl.port || "5432",
  "--username", decodeURIComponent(directUrl.username),
  "--dbname", directUrl.pathname.replace(/^\//, ""),
  "--format", "custom",
  "--no-owner",
  "--no-privileges",
  "--file", databaseFile,
], {
  stdio: "inherit",
  env: { ...process.env, PGPASSWORD: decodeURIComponent(directUrl.password), PGSSLMODE: "require" },
});
if (dump.status !== 0) throw new Error(`pg_dump failed with exit code ${dump.status}`);

const supabaseUrl = required("SUPABASE_URL").replace(/\/$/, "");
const secret = required("SUPABASE_SECRET_KEY");
if (!secret.startsWith("sb_secret_")) throw new Error("Storage backup requires the modern sb_secret key");
const compatibilityJwt = process.env.SUPABASE_STORAGE_AUTH_JWT?.trim();
const bucket = process.env.HAYDEV_DOCUMENT_BUCKET?.trim() || "haydev-documents";
const storage = new StorageClient(`${supabaseUrl}/storage/v1`, {
  apikey: secret,
  ...(compatibilityJwt ? { Authorization: `Bearer ${compatibilityJwt}` } : {}),
  "X-Client-Info": "haydevos-backup/1.0",
});

const objects = [];
async function walk(prefix = "") {
  let offset = 0;
  for (;;) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit: 1_000, offset });
    if (error) throw new Error(`Storage list failed: ${error.name ?? "StorageError"}`);
    for (const entry of data ?? []) {
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) await walk(key);
      else objects.push(key);
    }
    if ((data?.length ?? 0) < 1_000) break;
    offset += 1_000;
  }
}
await walk();

const storageManifest = [];
for (const key of objects) {
  const { data, error } = await storage.from(bucket).download(key);
  if (error) throw new Error(`Storage download failed for a manifest entry: ${error.name ?? "StorageError"}`);
  const bytes = Buffer.from(await data.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const localName = createHash("sha256").update(key).digest("hex") + ".bin";
  await writeFile(join(objectDirectory, localName), bytes, { mode: 0o600 });
  storageManifest.push({ key, localName, sizeBytes: bytes.length, sha256 });
}

const databaseBytes = await import("node:fs/promises").then(({ readFile }) => readFile(databaseFile));
const manifest = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  projectRef: new URL(supabaseUrl).hostname.split(".")[0],
  database: {
    file: "database.dump",
    sizeBytes: databaseBytes.length,
    sha256: createHash("sha256").update(databaseBytes).digest("hex"),
  },
  storage: { bucket, objectCount: storageManifest.length, objects: storageManifest },
};
await writeFile(join(destination, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });
console.log(`Backup completed: ${destination}`);
console.log(`Database SHA-256: ${manifest.database.sha256}; Storage objects: ${storageManifest.length}`);
