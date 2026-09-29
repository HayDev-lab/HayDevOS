import "server-only";

import type { LeadDb } from "./repository";
import { safeJson } from "./normalization";
import type { DomainContext } from "./types";

export async function appendLeadActivity(
  db: LeadDb,
  context: DomainContext,
  input: {
    leadId: string;
    type: string;
    body: string;
    metadata?: Record<string, unknown>;
    at?: Date;
  },
) {
  return db.leadActivity.create({
    data: {
      orgId: context.orgId,
      leadId: input.leadId,
      actorId: context.userId,
      type: input.type,
      body: input.body,
      metadata: input.metadata ? safeJson(input.metadata) : null,
      createdAt: input.at,
    },
  });
}

export async function appendLeadAudit(
  db: LeadDb,
  context: DomainContext,
  input: {
    action: string;
    entityType: string;
    entityId: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    details?: Record<string, unknown>;
  },
) {
  return db.auditLog.create({
    data: {
      orgId: context.orgId,
      userId: context.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: safeJson({
        initiatedBy: context.initiatedBy ?? "user",
        approvalId: context.approvalId ?? null,
        idempotencyKey: context.idempotencyKey ?? null,
        before: input.before ?? null,
        after: input.after ?? null,
        ...input.details,
      }),
    },
  });
}

