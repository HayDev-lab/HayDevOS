import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;
const BLOCK_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

type AttemptRow = { attempts: number; blockedUntil: Date };

let lastCleanupAt = 0;
let cleanupPromise: Promise<void> | null = null;

function bucketKey(scope: "account" | "address", identity: string): string {
  return `login:${scope}:${createHash("sha256").update(identity).digest("hex")}`;
}

export function loginClientAddress(req: NextRequest): string {
  return (
    (process.env.VERCEL === "1"
      ? req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : undefined) ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

async function cleanupExpiredLoginBuckets(): Promise<void> {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  if (!cleanupPromise) {
    lastCleanupAt = now;
    cleanupPromise = getDb().authThrottle.deleteMany({
      where: {
        key: { startsWith: "login:" },
        blockedUntil: { lt: new Date(now) },
      },
    }).then(() => undefined).finally(() => {
      cleanupPromise = null;
    });
  }
  await cleanupPromise;
}

async function reserveBucket(key: string): Promise<void> {
  const now = new Date();
  const windowExpiry = new Date(now.getTime() + WINDOW_MS);
  const blockExpiry = new Date(now.getTime() + BLOCK_MS);
  const rows = await getDb().$queryRaw<AttemptRow[]>(Prisma.sql`
    INSERT INTO "AuthThrottle" ("key", "attempts", "windowStart", "blockedUntil", "updatedAt")
    VALUES (${key}, 1, ${now}, ${windowExpiry}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE
        WHEN "AuthThrottle"."blockedUntil" < ${now} THEN 1
        ELSE "AuthThrottle"."attempts" + 1
      END,
      "windowStart" = CASE
        WHEN "AuthThrottle"."blockedUntil" < ${now} THEN ${now}
        ELSE "AuthThrottle"."windowStart"
      END,
      "blockedUntil" = CASE
        WHEN "AuthThrottle"."blockedUntil" < ${now} THEN ${windowExpiry}
        WHEN "AuthThrottle"."attempts" > ${MAX_ATTEMPTS} THEN "AuthThrottle"."blockedUntil"
        WHEN "AuthThrottle"."attempts" + 1 > ${MAX_ATTEMPTS} THEN ${blockExpiry}
        ELSE "AuthThrottle"."blockedUntil"
      END,
      "updatedAt" = ${now}
    RETURNING "attempts", "blockedUntil"
  `);

  if ((rows[0]?.attempts ?? MAX_ATTEMPTS + 1) > MAX_ATTEMPTS) {
    throw new ApiError(429, "LOGIN_THROTTLED", "Too many login attempts. Try again later.");
  }
}

export async function reserveLoginAttempts(
  email: string,
  address: string,
): Promise<void> {
  await cleanupExpiredLoginBuckets();
  // Reserve the address budget first so cycling email values cannot create an
  // unbounded set of account buckets after an address is already blocked.
  await reserveBucket(bucketKey("address", address));
  await reserveBucket(bucketKey("account", email));
}

export async function clearLoginAttempts(
  email: string,
  address: string,
): Promise<void> {
  await getDb().authThrottle.deleteMany({
    where: {
      key: {
        in: [bucketKey("address", address), bucketKey("account", email)],
      },
    },
  });
}
