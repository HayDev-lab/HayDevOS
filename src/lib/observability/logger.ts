import "server-only";

import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, string | number | boolean | null | undefined>;

const RESERVED_KEYS = new Set([
  "password",
  "token",
  "cookie",
  "authorization",
  "databaseUrl",
  "secret",
  "body",
  "content",
]);

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return RESERVED_KEYS.has(key) || [
    "password", "passwd", "token", "cookie", "authorization", "databaseurl",
    "apikey", "secret", "body", "content", "session", "credential",
  ].some((fragment) => normalized.includes(fragment));
}

function sanitize(fields: LogFields): LogFields {
  return Object.fromEntries(
    Object.entries(fields).filter(
      ([key, value]) => !isSensitiveKey(key) && value !== undefined,
    ),
  );
}

export function logEvent(
  level: LogLevel,
  event: string,
  fields: LogFields = {},
): void {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.HAYDEV_RELEASE ?? process.env.RELEASE_SHA ?? "local",
    environment: process.env.VERCEL_ENV ?? process.env.HAYDEV_ENVIRONMENT ?? process.env.NODE_ENV ?? "unknown",
    ...sanitize(fields),
  });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}

export async function reportServerError(
  event: string,
  fields: LogFields,
): Promise<void> {
  logEvent("error", event, fields);
  const endpoint = process.env.ERROR_WEBHOOK_URL?.trim();
  if (!endpoint) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        event,
        release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.HAYDEV_RELEASE ?? process.env.RELEASE_SHA ?? "local",
        environment: process.env.VERCEL_ENV ?? process.env.HAYDEV_ENVIRONMENT ?? process.env.NODE_ENV ?? "unknown",
        ...sanitize(fields),
      }),
      signal: controller.signal,
    });
  } catch {
    logEvent("warn", "error_report_delivery_failed", { eventName: event });
  } finally {
    clearTimeout(timeout);
  }
}

export function requestIdFrom(request: Request): string {
  const candidate =
    request.headers.get("x-request-id") ?? request.headers.get("x-vercel-id");
  return candidate && /^[A-Za-z0-9._:-]{1,160}$/.test(candidate)
    ? candidate
    : randomUUID();
}
