/**
 * Owner AI — POST /api/owner-ai/approve
 *
 * Body: { approvalId, decision: "approved" | "rejected", reason?, decidedBy, orgId }
 *
 * Looks up the pending approval, executes the underlying action (mock side
 * effects only) when approved, updates the action + approval status, logs an
 * audit event, and returns the updated approval + action + conversation.
 *
 * If the action is forbidden (somehow proposed despite the prompt), the
 * decision is recorded as rejected with a "Forbidden by policy" reason.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { decideApproval, getApproval } from "../audit";
import { getConversation } from "../audit";
import type { OwnerAiApproveRequest, OwnerAiApproveResponse } from "../types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: OwnerAiApproveRequest;
  try {
    body = (await req.json()) as OwnerAiApproveRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.approvalId) {
    return NextResponse.json({ error: "approvalId is required" }, { status: 400 });
  }
  if (body.decision !== "approved" && body.decision !== "rejected") {
    return NextResponse.json(
      { error: 'decision must be "approved" or "rejected"' },
      { status: 400 },
    );
  }

  const existing = getApproval(body.approvalId);
  if (!existing) {
    return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: `Approval already ${existing.status}` },
      { status: 409 },
    );
  }

  try {
    const { approval, action } = decideApproval({
      approvalId: body.approvalId,
      decision: body.decision,
      decidedBy: body.decidedBy ?? "unknown",
      reason: body.reason,
    });
    const conversation = getConversation(approval.conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }
    const response: OwnerAiApproveResponse = {
      approval,
      action,
      conversation,
    };
    return NextResponse.json(response);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || String(e) },
      { status: 500 },
    );
  }
}
