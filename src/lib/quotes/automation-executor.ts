import "server-only";

import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import type { AuthContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { toDomainContext } from "./context";
import { acceptQuote, archiveQuote, declineQuote, getQuote, sendQuote, submitQuote } from "./service";

const quoteActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submitQuote"), quoteId: z.string().optional(), reason: z.string().trim().max(2_000).optional() }).strict(),
  z.object({ action: z.literal("sendQuote"), quoteId: z.string().optional() }).strict(),
  z.object({ action: z.literal("archiveQuote"), quoteId: z.string().optional() }).strict(),
  z.object({ action: z.literal("acceptQuote"), quoteId: z.string().optional(), reason: z.string().trim().max(2_000).optional() }).strict(),
  z.object({ action: z.literal("declineQuote"), quoteId: z.string().optional(), reason: z.string().trim().max(2_000).optional() }).strict(),
]);

function parseObject(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try { const parsed: unknown = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null; }
  catch { return null; }
}

export async function executeQuoteAutomationRun(auth: AuthContext, runId: string, approvalId?: string) {
  const db = getDb();
  const run = await db.automationRun.findFirst({ where: { id: runId, orgId: auth.orgId }, select: {
    id: true, status: true, idempotencyKey: true, payload: true, automation: { select: { status: true, actionConfig: true } },
  } });
  if (!run) throw new ApiError(404, "AUTOMATION_RUN_NOT_FOUND", "Automation run not found");
  if (run.status === "success") return { runId, action: "already_completed", targetId: "" };
  if (run.automation.status !== "active") throw new ApiError(409, "AUTOMATION_NOT_ACTIVE", "Automation is not active");
  const parsed = quoteActionSchema.safeParse(parseObject(run.automation.actionConfig));
  if (!parsed.success) throw new ApiError(422, "INVALID_AUTOMATION_ACTION", "Quote automation action configuration is invalid");
  const payload = parseObject(run.payload);
  const quoteId = parsed.data.quoteId ?? (typeof payload?.quoteId === "string" ? payload.quoteId : undefined);
  if (!quoteId) throw new ApiError(422, "AUTOMATION_QUOTE_REQUIRED", "Automation run has no quote target");
  if (["acceptQuote", "declineQuote"].includes(parsed.data.action) && !approvalId) {
    throw new ApiError(403, "APPROVAL_REQUIRED", "A client-decision automation requires an approval reference");
  }
  const claimed = await db.automationRun.updateMany({ where: { id: run.id, orgId: auth.orgId, status: { in: ["queued", "awaiting_approval", "failed"] } }, data: { status: "running", startedAt: new Date(), finishedAt: null, error: null } });
  if (claimed.count !== 1) throw new ApiError(409, "AUTOMATION_RUN_BUSY", "Automation run is already executing");
  const context = toDomainContext(auth, { initiatedBy: "automation", approvalId, idempotencyKey: run.idempotencyKey ?? run.id });
  try {
    const quote = await getQuote(context, quoteId);
    if (parsed.data.action === "submitQuote") await submitQuote(context, quoteId, quote.revision, parsed.data.reason);
    if (parsed.data.action === "sendQuote") await sendQuote(context, quoteId, quote.revision);
    if (parsed.data.action === "archiveQuote") await archiveQuote(context, quoteId, quote.revision);
    if (parsed.data.action === "acceptQuote") await acceptQuote(context, quoteId, quote.revision, parsed.data.reason);
    if (parsed.data.action === "declineQuote") await declineQuote(context, quoteId, quote.revision, parsed.data.reason);
    await db.automationRun.update({ where: { id: run.id }, data: { status: "success", finishedAt: new Date() } });
    return { runId: run.id, action: parsed.data.action, targetId: quoteId };
  } catch (error) {
    await db.automationRun.update({ where: { id: run.id }, data: { status: "failed", finishedAt: new Date(), error: error instanceof Error ? error.message.slice(0, 1_000) : "Automation failed" } });
    throw error;
  }
}
