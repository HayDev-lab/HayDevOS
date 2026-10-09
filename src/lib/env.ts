import "server-only";

import { z } from "zod";

const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === "https:", {
  message: "must use HTTPS",
});

const legacySupabaseJwt = z.string().regex(
  /^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
  "must be a compact JWT",
);

const publicDomain = z.string().trim().max(253).regex(
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i,
  "HAYDEV_DOMAIN must be one canonical public DNS hostname",
);

const runtimeSchema = z.object({
  DATABASE_URL: z.string().startsWith("postgresql://"),
  APP_ORIGINS: z.string().min(1),
  SUPABASE_URL: httpsUrl,
  SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_").min(24),
  SUPABASE_STORAGE_AUTH_JWT: legacySupabaseJwt.optional(),
  HAYDEV_DOCUMENT_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
  MALWARE_SCANNER_PROVIDER: z.literal("metadefender"),
  // The scanner key is capability-specific: the application can serve the
  // authenticated UI without it, while readiness and upload paths remain
  // fail-closed. If configured, still reject malformed placeholder values.
  METADEFENDER_API_KEY: z.string().min(16).optional(),
  // Caddy production domain — required for the reverse-proxy site block.
  // Reject empty/wildcard/localhost values so production deploy fails fast
  // instead of binding a public site to an accidental default.
  HAYDEV_DOMAIN: publicDomain,
}).passthrough();

export type RuntimeEnvironment = z.infer<typeof runtimeSchema>;

function validateOrigins(value: string): string[] {
  const origins = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (origins.length === 0) throw new Error("APP_ORIGINS is empty");
  for (const value of origins) {
    if (value.includes("*")) throw new Error("APP_ORIGINS must not contain wildcards");
    const url = new URL(value);
    if (url.protocol !== "https:" || url.origin !== value) {
      throw new Error("APP_ORIGINS must contain canonical HTTPS origins only");
    }
  }
  return origins;
}

export function runtimeEnvironmentIssues(
  source: NodeJS.ProcessEnv = process.env,
): string[] {
  const parsed = runtimeSchema.safeParse(source);
  const issues = parsed.success
    ? []
    : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  try {
    validateOrigins(source.APP_ORIGINS ?? "");
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "APP_ORIGINS is invalid");
  }
  return issues;
}

export function validateRuntimeEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): RuntimeEnvironment {
  const parsed = runtimeSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid production environment: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  }
  validateOrigins(parsed.data.APP_ORIGINS);
  return parsed.data;
}

export function ownerAiEnvironmentConfigured(
  source: NodeJS.ProcessEnv = process.env,
): boolean {
  return z.object({
    OWNER_AI_BASE_URL: httpsUrl,
    OWNER_AI_API_KEY: z.string().min(16),
    OWNER_AI_MODEL: z.string().min(1).max(120),
  }).safeParse(source).success;
}
