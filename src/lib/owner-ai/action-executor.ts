import "server-only";

import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import type { AuthContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { addLeadNote, changeLeadStage, createLeadTask } from "@/lib/leads/service";
import { toDomainContext } from "@/lib/leads/context";
import { requireLeadPermission } from "@/lib/leads/permissions";
import { executeAutomationRun } from "@/lib/automations/executor";
import { acceptQuote, declineQuote, getQuote, rejectQuote } from "@/lib/quotes/service";
import { archiveDocument, generateQuoteArtifact } from "@/lib/documents";
import {
  adjustInventory,
  cancelOrder,
  confirmOrder,
  confirmPayment,
  createFulfillment,
  createOrderFromAcceptedQuote,
  refundPayment,
  transferInventory,
} from "@/lib/erp";
import { getApproval } from "@/app/api/owner-ai/audit";

export interface ActionExecutionResult {
  ok: boolean;
  message: string;
}

const id = z.string().trim().min(1).max(64);
const optionalDate = z
  .string()
  .datetime({ offset: true })
  .optional()
  .transform((value) => (value ? new Date(value) : undefined));

function cleanArgs(args: Record<string, unknown>): Record<string, unknown> {
  const { __approvalId: _approvalId, ...clean } = args;
  return clean;
}

function invalidActionInput(error: z.ZodError): never {
  throw new ApiError(
    422,
    "INVALID_ACTION_INPUT",
    "Action arguments are invalid",
    error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  );
}

async function assertTenantMember(userId: string, orgId: string): Promise<void> {
  const membership = await getDb().membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { id: true },
  });
  if (!membership) {
    throw new ApiError(422, "INVALID_ASSIGNEE", "Assignee is not a member of this organization");
  }
}

export async function executeTenantAction(
  context: AuthContext,
  action: string,
  rawArgs: Record<string, unknown>,
): Promise<ActionExecutionResult> {
  const args = cleanArgs(rawArgs);
  const db = getDb();
  const domainContext = toDomainContext(context, {
    initiatedBy: "owner_ai",
    approvalId: typeof rawArgs.__approvalId === "string" ? rawArgs.__approvalId : undefined,
    idempotencyKey: typeof rawArgs.__approvalId === "string" ? `owner-ai:${rawArgs.__approvalId}:${action}` : undefined,
  });

  if (context.role === "VIEWER") {
    throw new ApiError(403, "FORBIDDEN", "Viewer access is read-only");
  }

  if (domainContext.approvalId) {
    const approval = getApproval(domainContext.approvalId);
    if (!approval || approval.status !== "approved" || approval.action !== action) {
      throw new ApiError(403, "APPROVAL_REQUIRED", "A matching persisted and approved Owner AI action is required");
    }
  }

  try {
    switch (action) {
      case "createTask": {
        requireLeadPermission(domainContext, "lead.task");
        const input = z
          .object({
            title: z.string().trim().min(1).max(200),
            description: z.string().trim().max(5_000).optional(),
            assigneeId: id.optional(),
            assignee: id.optional(),
            dueAt: optionalDate,
            priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
            entityType: z.enum(["lead"]).optional(),
            entityId: id.optional(),
          })
          .strict()
          .parse(args);
        const assigneeId = input.assigneeId ?? input.assignee;
        if (assigneeId) await assertTenantMember(assigneeId, context.orgId);

        if (input.entityId) {
          const task = await createLeadTask(domainContext, input.entityId, {
            title: input.title,
            description: input.description,
            assigneeId,
            dueAt: input.dueAt?.toISOString(),
            priority: input.priority,
            type: "FOLLOW_UP",
          });
          return { ok: true, message: `Task ${task.id} created` };
        }

        const task = await db.task.create({
          data: {
            orgId: context.orgId,
            ownerId: context.userId,
            assigneeId,
            leadId: input.entityId,
            title: input.title,
            description: input.description,
            dueAt: input.dueAt,
            priority: input.priority,
          },
          select: { id: true },
        });
        return { ok: true, message: `Task ${task.id} created` };
      }

      case "createInternalNote": {
        const input = z
          .object({
            entityType: z.literal("lead"),
            entityId: id,
            body: z.string().trim().min(1).max(5_000),
          })
          .strict()
          .parse(args);
        const note = await addLeadNote(domainContext, input.entityId, input.body);
        return { ok: true, message: `Internal note ${note.id} created` };
      }

      case "assignTask": {
        requireLeadPermission(domainContext, "lead.assign");
        const input = z.object({ taskId: id, assigneeId: id }).strict().parse(args);
        await assertTenantMember(input.assigneeId, context.orgId);
        const updated = await db.task.updateMany({
          where: { id: input.taskId, orgId: context.orgId },
          data: { assigneeId: input.assigneeId },
        });
        if (updated.count !== 1) throw new ApiError(404, "RESOURCE_NOT_FOUND", "Task not found");
        return { ok: true, message: `Task ${input.taskId} reassigned` };
      }

      case "generateReport": {
        const input = z
          .object({
            type: z.enum(["daily", "weekly", "monthly", "quarterly"]).default("weekly"),
            window: z.enum(["today", "7d", "30d", "quarter"]).default("7d"),
          })
          .strict()
          .parse(args);
        const row = await db.auditLog.create({
          data: {
            orgId: context.orgId,
            userId: context.userId,
            action: "owner_ai.report_generated",
            entityType: "report",
            metadata: JSON.stringify(input),
          },
          select: { id: true },
        });
        return { ok: true, message: `Report request ${row.id} persisted` };
      }

      case "generateQuoteDocument": {
        const input = z.object({
          quoteId: id,
          versionId: id.optional(),
          format: z.enum(["pdf", "docx"]).default("pdf"),
          locale: z.enum(["hy", "ru", "en"]).default("en"),
        }).strict().parse(args);
        const artifact = await generateQuoteArtifact(domainContext, input.quoteId, input.versionId, input.format, input.locale);
        return { ok: true, message: `${input.format.toUpperCase()} ${artifact.id} generated; authorized download: ${artifact.downloadPath}` };
      }

      case "createOrderFromQuote": {
        const input = z.object({ quoteId: id }).strict().parse(args);
        const order = await createOrderFromAcceptedQuote({ ...domainContext, idempotencyKey: `owner-ai:quote:${input.quoteId}` }, input.quoteId);
        return { ok: true, message: `Draft order ${order.number} created from the accepted quote version` };
      }

      case "confirmOrder": {
        const input = z.object({ orderId: id, expectedRevision: z.number().int().positive(), warehouseId: id.optional() }).strict().parse(args);
        const order = await confirmOrder(domainContext, input.orderId, input.expectedRevision, input.warehouseId);
        return { ok: true, message: `Order ${order.number} confirmed at revision ${order.revision}` };
      }

      case "cancelOrder": {
        const input = z.object({ orderId: id, expectedRevision: z.number().int().positive(), reason: z.string().trim().min(1).max(2_000) }).strict().parse(args);
        const order = await cancelOrder(domainContext, input.orderId, input.expectedRevision, input.reason);
        return { ok: true, message: `Order ${order.number} cancelled and remaining reservations released` };
      }

      case "adjustInventory": {
        const input = z.object({ warehouseId: id, productId: id, delta: z.string(), reason: z.string().trim().min(1).max(1_000), reference: z.string().trim().max(240).optional() }).strict().parse(args);
        const movement = await adjustInventory(domainContext, input);
        return { ok: true, message: `Inventory adjustment ${movement.id} appended` };
      }

      case "transferInventory": {
        const input = z.object({ fromWarehouseId: id, toWarehouseId: id, productId: id, quantity: z.string(), reason: z.string().trim().min(1).max(1_000), reference: z.string().trim().max(240).optional() }).strict().parse(args);
        const transfer = await transferInventory(domainContext, input);
        return { ok: true, message: `Inventory transfer ${transfer.id} completed atomically` };
      }

      case "createFulfillment": {
        const input = z.object({
          orderId: id, expectedRevision: z.number().int().positive(), note: z.string().trim().max(2_000).optional(),
          items: z.array(z.object({ orderItemId: id, quantity: z.string() }).strict()).min(1).max(100),
        }).strict().parse(args);
        const fulfillment = await createFulfillment(domainContext, input.orderId, input);
        return { ok: true, message: `Fulfillment ${fulfillment.number} completed through the inventory ledger` };
      }

      case "confirmPayment": {
        const input = z.object({ paymentId: id, reason: z.string().trim().max(1_000).optional() }).strict().parse(args);
        const payment = await confirmPayment(domainContext, input.paymentId, input.reason);
        return { ok: true, message: `Payment ${payment.id} confirmed and its finance event appended` };
      }

      case "refundPayment": {
        const input = z.object({ paymentId: id, amount: z.string(), reason: z.string().trim().min(1).max(1_000), reference: z.string().trim().max(240).optional() }).strict().parse(args);
        const payment = await refundPayment(domainContext, input.paymentId, input);
        return { ok: true, message: `Refund ${payment.id} appended against payment ${input.paymentId}` };
      }

      case "runApprovedAutomation":
      case "highImpactAutomation": {
        const input = z.object({ automationId: id }).strict().parse(args);
        const automation = await db.automation.findFirst({
          where: { id: input.automationId, orgId: context.orgId },
          select: { id: true, status: true },
        });
        if (!automation) {
          throw new ApiError(404, "RESOURCE_NOT_FOUND", "Automation not found");
        }
        if (automation.status !== "active") {
          throw new ApiError(409, "AUTOMATION_NOT_ACTIVE", "Automation is not active");
        }
        if (!domainContext.approvalId) {
          throw new ApiError(403, "APPROVAL_REQUIRED", "Automation execution requires an approval reference");
        }
        const idempotencyKey = `owner-ai-approval:${domainContext.approvalId}`;
        await db.automationRun.createMany({
          data: [{
            orgId: context.orgId,
            automationId: automation.id,
            status: "queued",
            eventType: "manual.approved",
            idempotencyKey,
          }],
          skipDuplicates: true,
        });
        const run = await db.automationRun.findUniqueOrThrow({
          where: { orgId_automationId_idempotencyKey: { orgId: context.orgId, automationId: automation.id, idempotencyKey } },
          select: { id: true },
        });
        const result = await executeAutomationRun(context, run.id, domainContext.approvalId);
        return { ok: true, message: `Automation run ${result.runId} executed ${result.action}` };
      }

      case "setLeadStage": {
        const input = z
          .object({
            leadId: id,
            stage: z.enum([
              "new",
              "contacted",
              "qualified",
              "proposal",
              "negotiation",
              "won",
              "lost",
            ]),
          })
          .strict()
          .parse(args);
        await changeLeadStage(domainContext, input.leadId, { stage: input.stage });
        return { ok: true, message: `Lead ${input.leadId} moved to ${input.stage}` };
      }

      case "markQuoteWon":
      case "markQuoteLost": {
        const input = z.object({ quoteId: id }).strict().parse(args);
        if (!domainContext.approvalId) {
          throw new ApiError(403, "APPROVAL_REQUIRED", "Owner AI quote decisions require a persisted approval reference");
        }
        const quote = await getQuote(domainContext, input.quoteId);
        if (action === "markQuoteWon") {
          await acceptQuote(domainContext, input.quoteId, quote.revision, "Approved Owner AI action");
          return { ok: true, message: `Quote ${input.quoteId} accepted through the canonical QuoteFlow state machine` };
        }
        if (quote.status === "pending_approval") {
          await rejectQuote(domainContext, input.quoteId, quote.revision, "Approved Owner AI action");
        } else {
          await declineQuote(domainContext, input.quoteId, quote.revision, "Approved Owner AI action");
        }
        return { ok: true, message: `Quote ${input.quoteId} declined through the canonical QuoteFlow state machine` };
      }

      case "archiveRecord": {
        if (!domainContext.approvalId) {
          throw new ApiError(403, "APPROVAL_REQUIRED", "Archiving requires a persisted approval reference");
        }
        const input = z.object({ entityType: z.literal("document"), entityId: id }).strict().parse(args);
        await archiveDocument(domainContext, input.entityId);
        return { ok: true, message: `Document ${input.entityId} archived through DocumentService` };
      }

      default:
        throw new ApiError(
          501,
          "ACTION_NOT_IMPLEMENTED",
          `Action ${action} has no production executor and was not run`,
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) invalidActionInput(error);
    throw error;
  }
}
