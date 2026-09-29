import type { NextRequest } from "next/server";
import type { ZodType } from "zod";

import { ApiError } from "./errors";

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

function requestOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || new URL(req.url).protocol.replace(":", "");
  return host ? `${protocol}://${host}` : new URL(req.url).origin;
}

export function assertSameOrigin(req: NextRequest): void {
  const origin = req.headers.get("origin");
  if (!origin) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(403, "ORIGIN_REQUIRED", "Origin header is required");
    }
    return;
  }

  const configuredOrigins = new Set<string>();
  for (const configured of (process.env.APP_ORIGINS ?? "").split(",")) {
    const value = configured.trim();
    if (!value) continue;
    try {
      configuredOrigins.add(new URL(value).origin);
    } catch {
      throw new ApiError(
        500,
        "INVALID_ORIGIN_CONFIGURATION",
        "Allowed browser origins are misconfigured",
      );
    }
  }

  if (process.env.NODE_ENV === "production" && configuredOrigins.size === 0) {
    throw new ApiError(
      500,
      "ORIGIN_CONFIGURATION_REQUIRED",
      "Allowed browser origins are not configured",
    );
  }

  const allowed =
    process.env.NODE_ENV === "production"
      ? configuredOrigins
      : new Set([requestOrigin(req), ...configuredOrigins]);

  let normalizedOrigin: string;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    throw new ApiError(403, "INVALID_ORIGIN", "Cross-origin request rejected");
  }

  if (!allowed.has(normalizedOrigin)) {
    throw new ApiError(403, "INVALID_ORIGIN", "Cross-origin request rejected");
  }
}

export async function parseJson<T>(
  req: NextRequest,
  schema: ZodType<T>,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
): Promise<T> {
  const contentType = req.headers.get("content-type")?.split(";")[0]?.trim();
  if (contentType !== "application/json") {
    throw new ApiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type must be application/json",
    );
  }

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  }

  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > maxBodyBytes) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body is not valid JSON");
  }

  return schema.parse(value);
}
