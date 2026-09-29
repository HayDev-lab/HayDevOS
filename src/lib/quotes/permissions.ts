import { ApiError } from "@/lib/api/errors";
import type { TenantRole } from "@/lib/auth/types";
import type { DomainContext } from "./types";

export type QuotePermission =
  | "quote.read" | "quote.create" | "quote.update" | "quote.submit"
  | "quote.approve" | "quote.send" | "quote.decide" | "quote.archive"
  | "quote.override_price" | "quote.generate_document" | "catalog.manage" | "settings.manage";

const ALL = new Set<QuotePermission>([
  "quote.read", "quote.create", "quote.update", "quote.submit", "quote.approve",
  "quote.send", "quote.decide", "quote.archive", "quote.override_price",
  "quote.generate_document", "catalog.manage", "settings.manage",
]);

const ROLE_PERMISSIONS: Record<TenantRole, ReadonlySet<QuotePermission>> = {
  OWNER: ALL,
  ADMIN: ALL,
  MANAGER: new Set([
    "quote.read", "quote.create", "quote.update", "quote.submit", "quote.approve",
    "quote.send", "quote.decide", "quote.archive", "quote.override_price", "catalog.manage",
    "quote.generate_document",
  ]),
  MEMBER: new Set(["quote.read", "quote.create", "quote.update", "quote.submit", "quote.generate_document"]),
  VIEWER: new Set(["quote.read"]),
};

export function canQuote(context: DomainContext, permission: QuotePermission): boolean {
  return ROLE_PERMISSIONS[context.role]?.has(permission) ?? false;
}

export function requireQuotePermission(context: DomainContext, permission: QuotePermission): void {
  if (!canQuote(context, permission)) {
    throw new ApiError(403, "FORBIDDEN", "Insufficient QuoteFlow permissions");
  }
}
