import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";

export interface RateLimitRule {
  scope: string;
  limit: number;
  windowMs: number;
}

type RateRow = { attempts: number; windowStart: Date };

function normalizedKey(scope: string, identity: string): string {
  return `rate:${scope}:${createHash("sha256").update(identity).digest("hex")}`;
}

export async function enforceRateLimit(
  rule: RateLimitRule,
  identity: string,
): Promise<void> {
  const key = normalizedKey(rule.scope, identity);
  const now = new Date();
  const resetBefore = new Date(now.getTime() - rule.windowMs);
  const expiresAt = new Date(now.getTime() + rule.windowMs * 2);

  const rows = await getDb().$queryRaw<RateRow[]>(Prisma.sql`
    INSERT INTO "AuthThrottle" ("key", "attempts", "windowStart", "blockedUntil", "updatedAt")
    VALUES (${key}, 1, ${now}, ${expiresAt}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE
        WHEN "AuthThrottle"."windowStart" < ${resetBefore} THEN 1
        ELSE "AuthThrottle"."attempts" + 1
      END,
      "windowStart" = CASE
        WHEN "AuthThrottle"."windowStart" < ${resetBefore} THEN ${now}
        ELSE "AuthThrottle"."windowStart"
      END,
      "blockedUntil" = ${expiresAt},
      "updatedAt" = ${now}
    RETURNING "attempts", "windowStart"
  `);

  if ((rows[0]?.attempts ?? rule.limit + 1) > rule.limit) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Try again later.");
  }
}

export async function cleanupExpiredRateLimits(): Promise<number> {
  const result = await getDb().authThrottle.deleteMany({
    where: {
      key: { startsWith: "rate:" },
      blockedUntil: { lt: new Date() },
    },
  });
  return result.count;
}
