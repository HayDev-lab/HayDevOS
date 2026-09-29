import "server-only";

import type { LeadDb } from "./repository";
import { safeJson } from "./normalization";
import type { DomainContext } from "./types";

const TRIGGER_TYPES: Record<string, string[]> = {
  "lead.created": ["lead_created", "LEAD_INGESTED"],
  "lead.ingested": ["lead_created", "LEAD_INGESTED"],
  "lead.updated": ["lead_updated"],
  "lead.stage_changed": ["lead_stage_changed", "stage_change"],
  "lead.assigned": ["lead_assigned"],
  "lead.task_created": ["lead_task_created"],
  "lead.task_completed": ["lead_task_completed"],
};

export async function queueLeadAutomationEvent(
  db: LeadDb,
  context: DomainContext,
  input: {
    eventType: keyof typeof TRIGGER_TYPES;
    leadId: string;
    eventKey: string;
    payload?: Record<string, unknown>;
  },
): Promise<number> {
  const triggerTypes = TRIGGER_TYPES[input.eventType] ?? [];
  if (triggerTypes.length === 0) return 0;

  const automations = await db.automation.findMany({
    where: { orgId: context.orgId, status: "active", triggerType: { in: triggerTypes } },
    select: { id: true },
  });
  if (automations.length === 0) return 0;

  const result = await db.automationRun.createMany({
    data: automations.map((automation) => ({
      orgId: context.orgId,
      automationId: automation.id,
      status: "queued",
      eventType: input.eventType,
      idempotencyKey: input.eventKey,
      payload: safeJson({ leadId: input.leadId, ...input.payload }),
    })),
    skipDuplicates: true,
  });
  return result.count;
}

