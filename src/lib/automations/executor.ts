import "server-only";

import { ApiError } from "@/lib/api/errors";
import type { AuthContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { executeLeadAutomationRun } from "@/lib/leads/automation-executor";
import { executeQuoteAutomationRun } from "@/lib/quotes/automation-executor";
import { executeErpAutomationRun } from "@/lib/erp/automation-executor";

export async function executeAutomationRun(auth: AuthContext, runId: string, approvalId?: string) {
  const run = await getDb().automationRun.findFirst({ where: { id: runId, orgId: auth.orgId }, select: { automation: { select: { actionConfig: true } } } });
  if (!run) throw new ApiError(404, "AUTOMATION_RUN_NOT_FOUND", "Automation run not found");
  let action: unknown;
  try { action = JSON.parse(run.automation.actionConfig ?? "null"); } catch { action = null; }
  const name = action && typeof action === "object" && "action" in action ? (action as { action?: unknown }).action : null;
  if (name === "createOrderFromAcceptedQuote") return executeErpAutomationRun(auth, runId);
  if (typeof name === "string" && ["submitQuote", "sendQuote", "archiveQuote", "acceptQuote", "declineQuote"].includes(name)) {
    return executeQuoteAutomationRun(auth, runId, approvalId);
  }
  return executeLeadAutomationRun(auth, runId, approvalId);
}
