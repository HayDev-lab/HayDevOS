import { ApiError } from "@/lib/api/errors";
import type { TenantRole } from "@/lib/auth/types";

import type { DomainContext } from "./types";

export type LeadPermission =
  | "lead.read"
  | "lead.create"
  | "lead.update"
  | "lead.assign"
  | "lead.move_stage"
  | "lead.note"
  | "lead.task"
  | "lead.archive"
  | "pipeline.manage"
  | "sla.manage"
  | "integration.manage";

const ROLE_PERMISSIONS: Record<TenantRole, ReadonlySet<LeadPermission>> = {
  OWNER: new Set<LeadPermission>([
    "lead.read", "lead.create", "lead.update", "lead.assign", "lead.move_stage",
    "lead.note", "lead.task", "lead.archive", "pipeline.manage", "sla.manage",
    "integration.manage",
  ]),
  ADMIN: new Set<LeadPermission>([
    "lead.read", "lead.create", "lead.update", "lead.assign", "lead.move_stage",
    "lead.note", "lead.task", "lead.archive", "pipeline.manage", "sla.manage",
    "integration.manage",
  ]),
  MANAGER: new Set<LeadPermission>([
    "lead.read", "lead.create", "lead.update", "lead.assign", "lead.move_stage",
    "lead.note", "lead.task", "lead.archive",
  ]),
  MEMBER: new Set<LeadPermission>([
    "lead.read", "lead.create", "lead.update", "lead.note", "lead.task",
  ]),
  VIEWER: new Set<LeadPermission>(["lead.read"]),
};

export function canLead(context: DomainContext, permission: LeadPermission): boolean {
  return ROLE_PERMISSIONS[context.role]?.has(permission) ?? false;
}

export function requireLeadPermission(
  context: DomainContext,
  permission: LeadPermission,
): void {
  if (!canLead(context, permission)) {
    throw new ApiError(403, "FORBIDDEN", "Insufficient LeadOS permissions");
  }
}

