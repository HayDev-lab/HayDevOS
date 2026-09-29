import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { executeTenantAction } from "@/lib/owner-ai/action-executor";
import {
  decideApproval,
  getApproval,
  getConversation,
  markActionResult,
  withPersistentAuditStore,
} from "../audit";
import type { OwnerAiApproveResponse } from "../types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const approveSchema = z
  .object({
    approvalId: z.string().regex(/^[A-Za-z0-9_-]+$/).max(128),
    decision: z.enum(["approved", "rejected"]),
    reason: z.string().trim().max(1_000).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  return withTenantApi(
    req,
    { mutation: true, roles: ["OWNER", "ADMIN"] },
    async (context) => {
      const body = await parseJson(req, approveSchema, 16 * 1024);
      return withPersistentAuditStore(
        {
          orgId: context.orgId,
          userId: context.userId,
          scope: "tenant",
          focusAuditId: body.approvalId,
        },
        async () => {
          const existing = getApproval(body.approvalId);
          if (!existing) {
            throw new ApiError(404, "APPROVAL_NOT_FOUND", "Approval not found");
          }
          if (existing.status !== "pending") {
            throw new ApiError(409, "APPROVAL_DECIDED", `Approval already ${existing.status}`);
          }

          const { approval, action } = decideApproval({
            approvalId: body.approvalId,
            decision: body.decision,
            decidedBy: context.userId,
            reason: body.reason,
          });

          if (body.decision === "approved") {
            try {
              const result = await executeTenantAction(context, action.action, action.args);
              markActionResult(action.id, result);
            } catch (error) {
              markActionResult(action.id, {
                ok: false,
                message: error instanceof Error ? error.message : "Action execution failed",
              });
            }
          }

          const conversation = getConversation(approval.conversationId);
          if (!conversation) {
            throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation not found");
          }
          const response: OwnerAiApproveResponse = {
            approval,
            action,
            conversation,
          };
          return NextResponse.json(response);
        },
      );
    },
  );
}
