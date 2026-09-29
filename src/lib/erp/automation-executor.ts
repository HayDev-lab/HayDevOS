import "server-only";

import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import type { AuthContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { toDomainContext } from "./context";
import { createOrderFromAcceptedQuote } from "./orders";

const actionSchema = z.object({ action: z.literal("createOrderFromAcceptedQuote"), quoteId: z.string().optional() }).strict();

function object(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try { const parsed: unknown = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null; }
  catch { return null; }
}

export async function executeErpAutomationRun(auth: AuthContext, runId: string) {
  const db = getDb();
  const run = await db.automationRun.findFirst({ where: { id: runId, orgId: auth.orgId }, select: {
    id: true, status: true, idempotencyKey: true, payload: true,
    automation: { select: { status: true, actionConfig: true } },
  } });
  if (!run) throw new ApiError(404, "AUTOMATION_RUN_NOT_FOUND", "Automation run not found");
  if (run.status === "success") return { runId, action: "already_completed", targetId: "" };
  if (run.automation.status !== "active") throw new ApiError(409, "AUTOMATION_NOT_ACTIVE", "Automation is not active");
  const action = actionSchema.safeParse(object(run.automation.actionConfig));
  if (!action.success) throw new ApiError(422, "INVALID_AUTOMATION_ACTION", "ERP automation action configuration is invalid");
  const payload = object(run.payload);
  const quoteId = action.data.quoteId ?? (typeof payload?.quoteId === "string" ? payload.quoteId : undefined);
  if (!quoteId) throw new ApiError(422, "AUTOMATION_QUOTE_REQUIRED", "Automation run has no quote target");
  const claimed = await db.automationRun.updateMany({
    where: { id: run.id, orgId: auth.orgId, status: { in: ["queued", "failed"] } },
    data: { status: "running", startedAt: new Date(), finishedAt: null, error: null },
  });
  if (claimed.count !== 1) throw new ApiError(409, "AUTOMATION_RUN_BUSY", "Automation run is already executing");
  const context = toDomainContext(auth, { initiatedBy: "automation", idempotencyKey: run.idempotencyKey ?? run.id });
  try {
    const order = await createOrderFromAcceptedQuote(context, quoteId);
    await db.automationRun.update({ where: { id: run.id }, data: { status: "success", finishedAt: new Date() } });
    return { runId: run.id, action: action.data.action, targetId: order.id };
  } catch (error) {
    await db.automationRun.update({ where: { id: run.id }, data: { status: "failed", finishedAt: new Date(), error: error instanceof Error ? error.message.slice(0, 1_000) : "Automation failed" } });
    throw error;
  }
}
