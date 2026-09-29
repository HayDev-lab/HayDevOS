import { ApiError } from "@/lib/api/errors";
import type { TenantRole } from "@/lib/auth/types";
import type { DomainContext } from "./types";

export type DocumentPermission =
  | "document.read"
  | "document.upload"
  | "document.generate"
  | "document.archive"
  | "document.template.manage";

const ALL = new Set<DocumentPermission>([
  "document.read",
  "document.upload",
  "document.generate",
  "document.archive",
  "document.template.manage",
]);

const ROLE_PERMISSIONS: Record<TenantRole, ReadonlySet<DocumentPermission>> = {
  OWNER: ALL,
  ADMIN: ALL,
  MANAGER: new Set(["document.read", "document.upload", "document.generate", "document.archive"]),
  MEMBER: new Set(["document.read", "document.upload", "document.generate"]),
  VIEWER: new Set(["document.read"]),
};

export function requireDocumentPermission(context: DomainContext, permission: DocumentPermission): void {
  if (!ROLE_PERMISSIONS[context.role]?.has(permission)) {
    throw new ApiError(403, "FORBIDDEN", "Insufficient DocumentFlow permissions");
  }
}
