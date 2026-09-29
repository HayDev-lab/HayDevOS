#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const standalone = path.join(root, ".next", "standalone");
const server = path.join(standalone, "server.js");
const outputDirectory = path.join(root, ".artifacts");

async function requireFile(file, message) {
  const details = await stat(file).catch(() => null);
  if (!details?.isFile()) throw new Error(message);
}

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function safeReleaseId(value) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value)) {
    throw new Error("Release ID must contain only letters, digits, dots, underscores and hyphens");
  }
  return value;
}

async function walk(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path.join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

function assertSafeArtifactPath(relative) {
  const parts = relative.split(/[\\/]/).map((part) => part.toLowerCase());
  const topLevel = parts[0] === "." ? parts[1] : parts[0];
  const forbiddenDirectory = parts.includes(".git") || [".tmp", "db", "upload", "download"].includes(topLevel);
  const forbiddenEnvironment = parts.some((part) => part === ".env" || part.startsWith(".env."));
  if (forbiddenDirectory || forbiddenEnvironment) {
    throw new Error(`Forbidden path entered the release artifact: ${relative}`);
  }
}

async function sha256(file) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

await requireFile(server, "Standalone server is missing. Run npm run build first.");

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const commit = git(["rev-parse", "--short=12", "HEAD"]);
const dirty = git(["status", "--porcelain"]) !== "";
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const requestedId = process.argv[2]?.trim();
const releaseId = safeReleaseId(requestedId || `${timestamp}-${commit}${dirty ? "-dirty" : ""}`);
const archiveName = `haydevos-${releaseId}.tar.gz`;
const archive = path.join(outputDirectory, archiveName);
const checksumFile = `${archive}.sha256`;

if (await stat(archive).catch(() => null)) throw new Error(`Release artifact already exists: ${archive}`);
await mkdir(outputDirectory, { recursive: true });

const temporaryPrefix = path.join(tmpdir(), "haydevos-release-");
const staging = await mkdtemp(temporaryPrefix);
try {
  await cp(standalone, staging, { recursive: true, force: false, dereference: true });
  await mkdir(path.join(staging, "scripts"), { recursive: true });
  for (const script of ["backup-production.mjs", "restore-drill.mjs"]) {
    await cp(path.join(root, "scripts", script), path.join(staging, "scripts", script));
  }

  await writeFile(path.join(staging, "RELEASE.json"), `${JSON.stringify({
    releaseId,
    createdAt: new Date().toISOString(),
    sourceCommit: commit,
    sourceDirty: dirty,
    appVersion: packageJson.version,
    nodeVersion: process.version,
  }, null, 2)}\n`, { mode: 0o644 });

  for (const relative of await walk(staging)) assertSafeArtifactPath(relative);

  const packed = spawnSync("tar", ["-czf", archive, "-C", staging, "."], { stdio: "inherit" });
  if (packed.status !== 0) throw new Error(`tar failed with exit code ${packed.status}`);

  const digest = await sha256(archive);
  await writeFile(checksumFile, `${digest}  ${archiveName}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ releaseId, archive, checksumFile, sha256: digest, sourceDirty: dirty }));
} finally {
  if (!staging.startsWith(temporaryPrefix)) throw new Error("Unsafe temporary release path");
  await rm(staging, { recursive: true, force: true });
}
