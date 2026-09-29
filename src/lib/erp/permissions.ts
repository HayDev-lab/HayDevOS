import { ApiError } from "@/lib/api/errors";
import type { TenantRole } from "@/lib/auth/types";
import type { DomainContext } from "./types";

export type ErpPermission =
  | "erp.read"
  | "customer.manage"
  | "product.manage"
  | "warehouse.manage"
  | "order.create"
  | "order.confirm"
  | "order.cancel"
  | "order.complete"
  | "inventory.receive"
  | "inventory.adjust"
  | "inventory.transfer"
  | "fulfillment.create"
  | "payment.record"
  | "payment.confirm"
  | "payment.refund"
  | "document.link";

const ALL = new Set<ErpPermission>([
  "erp.read", "customer.manage", "product.manage", "warehouse.manage",
  "order.create", "order.confirm", "order.cancel", "order.complete",
  "inventory.receive", "inventory.adjust", "inventory.transfer",
  "fulfillment.create", "payment.record", "payment.confirm", "payment.refund",
  "document.link",
]);

const ROLE_PERMISSIONS: Record<TenantRole, ReadonlySet<ErpPermission>> = {
  OWNER: ALL,
  ADMIN: ALL,
  MANAGER: new Set([
    "erp.read", "customer.manage", "product.manage", "warehouse.manage",
    "order.create", "order.confirm", "order.cancel", "order.complete",
    "inventory.receive", "inventory.transfer", "fulfillment.create",
    "payment.record", "payment.confirm", "payment.refund", "document.link",
  ]),
  MEMBER: new Set(["erp.read", "order.create", "fulfillment.create", "payment.record", "document.link"]),
  VIEWER: new Set(["erp.read"]),
};

export function canErp(context: DomainContext, permission: ErpPermission): boolean {
  return ROLE_PERMISSIONS[context.role]?.has(permission) ?? false;
}

export function requireErpPermission(context: DomainContext, permission: ErpPermission): void {
  if (!canErp(context, permission)) {
    throw new ApiError(403, "FORBIDDEN", "Insufficient ERP permissions");
  }
}

export function requireOwnerAiApproval(context: DomainContext, action: string): void {
  if (context.initiatedBy === "owner_ai" && !context.approvalId) {
    throw new ApiError(403, "APPROVAL_REQUIRED", `Owner AI ${action} requires a persisted approval`);
  }
}
