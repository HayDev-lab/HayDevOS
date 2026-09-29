import "server-only";

import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import type { AuthContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { parseSafeJson } from "./normalization";
import { toDomainContext } from "./context";
import { addLeadNote, assignLead, changeLeadStage, createLeadTask } from "./service";

const automationActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("changeLeadStage"), leadId: z.string().optional(), stage: z.enum(["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]) }).strict(),
  z.object({ action: z.literal("assignLead"), leadId: z.string().optional(), ownerId: z.string().nullable() }).strict(),
  z.object({ action: z.literal("createLeadTask"), leadId: z.string().optional(), title: z.string().trim().min(1).max(200), description: z.string().trim().max(5_000).optional(), assigneeId: z.string().optional(), type: z.enum(["FOLLOW_UP", "CALL", "EMAIL", "MEETING", "OTHER"]).default("FOLLOW_UP"), priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"), dueAt: z.string().datetime({ offset: true }).optional() }).strict(),
  z.object({ action: z.literal("addLeadNote"), leadId: z.string().optional(), body: z.string().trim().min(1).max(5_000) }).strict(),
]);

export async function executeLeadAutomationRun(
  auth: AuthContext,
  runId: string,
  approvalId?: string,
): Promise<{ runId: string; action: string; targetId: string }> {
  const db = getDb();
  const run = await db.automationRun.findFirst({
    where: { id: runId, orgId: auth.orgId },
    select: {
      id: true,
      status: true,
      idempotencyKey: true,
      payload: true,
      automation: { select: { status: true, actionConfig: true } },
    },
  });
  if (!run) throw new ApiError(404, "AUTOMATION_RUN_NOT_FOUND", "Automation run not found");
  if (run.status === "success") return { runId, action: "already_completed", targetId: "" };
  if (run.automation.status !== "active") throw new ApiError(409, "AUTOMATION_NOT_ACTIVE", "Automation is not active");

  const parsedAction = automationActionSchema.safeParse(parseSafeJson(run.automation.actionConfig));
  if (!parsedAction.success) throw new ApiError(422, "INVALID_AUTOMATION_ACTION", "Automation action configuration is invalid");
  const payload = parseSafeJson(run.payload);
  const payloadLeadId = typeof payload?.leadId === "string" ? payload.leadId : undefined;
  const leadId = parsedAction.data.leadId ?? payloadLeadId;
  if (!leadId) throw new ApiError(422, "AUTOMATION_LEAD_REQUIRED", "Automation run has no lead target");

  const claimed = await db.automationRun.updateMany({
    where: { id: run.id, orgId: auth.orgId, status: { in: ["queued", "awaiting_approval", "failed"] } },
    data: { status: "running", startedAt: new Date(), finishedAt: null, error: null },
  });
  if (claimed.count !== 1) throw new ApiError(409, "AUTOMATION_RUN_BUSY", "Automation run is already executing");

  const context = toDomainContext(auth, {
    initiatedBy: "automation",
    approvalId,
    idempotencyKey: run.idempotencyKey ?? run.id,
  });

  try {
    const action = parsedAction.data;
    if (action.action === "changeLeadStage") await changeLeadStage(context, leadId, { stage: action.stage });
    if (action.action === "assignLead") await assignLead(context, leadId, action.ownerId);
    if (action.action === "createLeadTask") await createLeadTask(context, leadId, {
      title: action.title,
      description: action.description,
      assigneeId: action.assigneeId,
      type: action.type,
      priority: action.priority,
      dueAt: action.dueAt,
    });
    if (action.action === "addLeadNote") await addLeadNote(context, leadId, action.body);
    await db.automationRun.update({ where: { id: run.id }, data: { status: "success", finishedAt: new Date() } });
    return { runId: run.id, action: action.action, targetId: leadId };
  } catch (error) {
    await db.automationRun.update({
      where: { id: run.id },
      data: { status: "failed", finishedAt: new Date(), error: error instanceof Error ? error.message.slice(0, 1_000) : "Automation failed" },
    });
    throw error;
  }
}
