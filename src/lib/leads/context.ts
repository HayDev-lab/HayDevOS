import type { AuthContext } from "@/lib/auth/session";

import type { DomainContext } from "./types";

export function toDomainContext(
  context: AuthContext,
  overrides: Partial<Pick<DomainContext, "initiatedBy" | "approvalId" | "idempotencyKey">> = {},
): DomainContext {
  return {
    userId: context.userId,
    orgId: context.orgId,
    role: context.role,
    initiatedBy: "user",
    ...overrides,
  };
}

