import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { ownerAiEnvironmentConfigured, runtimeEnvironmentIssues } from "@/lib/env";
import { getMalwareScanner } from "@/lib/malware";
import { logEvent } from "@/lib/observability/logger";
import { documentBucket, getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DependencyChecks = {
  configuration: boolean;
  database: boolean;
  storage: boolean;
  scanner: boolean;
  ownerAi: boolean;
};

const READY_CACHE_MS = 15_000;
const NOT_READY_CACHE_MS = 5_000;
const DEPENDENCY_TIMEOUT_MS = 5_000;
let cachedChecks: { expiresAt: number; promise: Promise<DependencyChecks> } | null = null;

async function boundedCheck(check: Promise<boolean>): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      check.catch(() => false),
      new Promise<boolean>((resolve) => {
        timeout = setTimeout(() => resolve(false), DEPENDENCY_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function databaseReady(): Promise<boolean> {
  try {
    await getDb().$queryRaw(Prisma.sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

async function freshChecks(): Promise<DependencyChecks> {
  const [database, storage, scanner] = await Promise.all([
    boundedCheck(databaseReady()),
    boundedCheck(getStorage().health(documentBucket())),
    boundedCheck(getMalwareScanner().health()),
  ]);
  return {
    configuration: runtimeEnvironmentIssues().length === 0,
    database,
    storage,
    scanner,
    ownerAi: ownerAiEnvironmentConfigured(),
  };
}

function dependencyChecks(): Promise<DependencyChecks> {
  const now = Date.now();
  if (cachedChecks && cachedChecks.expiresAt > now) return cachedChecks.promise;
  const entry = {
    expiresAt: now + READY_CACHE_MS,
    promise: freshChecks(),
  };
  entry.promise = entry.promise.then((checks) => {
    const ready = checks.configuration && checks.database && checks.storage && checks.scanner;
    entry.expiresAt = Date.now() + (ready ? READY_CACHE_MS : NOT_READY_CACHE_MS);
    return checks;
  });
  cachedChecks = entry;
  return entry.promise;
}

export async function GET() {
  const { configuration, database, storage, scanner, ownerAi } = await dependencyChecks();
  // Owner AI is an optional subsystem for core availability. Its state is
  // exposed without making the whole SaaS fail startup when the provider is
  // intentionally disabled.
  const ready = configuration && database && storage && scanner;
  const checks = { configuration, database, storage, scanner, ownerAi };
  logEvent(ready ? "info" : "warn", "readiness_checked", {
    ready,
    database,
    storage,
    scanner,
    configuration,
    ownerAi,
  });
  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checks,
      release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.HAYDEV_RELEASE ?? process.env.RELEASE_SHA ?? "local",
      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
