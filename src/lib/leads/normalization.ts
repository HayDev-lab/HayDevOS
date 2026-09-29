import { ApiError } from "@/lib/api/errors";

export function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized || null;
}

export function normalizePhone(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    throw new ApiError(422, "INVALID_PHONE", "Phone must contain 7 to 15 digits");
  }
  return `+${digits}`;
}

export function cleanNullable(value: string | null | undefined): string | null {
  const cleaned = value?.trim() ?? "";
  return cleaned || null;
}

export function safeJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (typeof item === "string" && item.length > 2_000) return `${item.slice(0, 2_000)}…`;
    return item;
  });
}

export function parseSafeJson(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

