/**
 * Owner AI — POST /api/owner-ai
 *
 * Receives { messages, conversationId?, mode, activeModule? }, calls the
 * LLM via a configured OpenAI-compatible endpoint with a system prompt defining the Owner AI role +
 * available read tools + safe actions, runs the tool-call loop, executes safe
 * actions, queues risky actions as approvals, and returns the assistant
 * response + tool calls + pending approvals.
 *
 * Development may use the deterministic offline engine. Production fails
 * closed when provider credentials are absent or the provider is unavailable.
 *
 * Provider credentials remain server-side and are never returned to clients.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import type { AuthContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { executeTenantAction } from "@/lib/owner-ai/action-executor";
import {
  createOwnerAiCompletion,
  ownerAiDemoEnabled,
  type OwnerAiChatMessage,
} from "@/lib/owner-ai/provider";
import {
  extractOwnerAiActions,
  executableOwnerAiActions,
  MAX_OWNER_AI_ACTIONS_PER_RUN,
  OwnerAiActionLimitError,
} from "@/lib/owner-ai/protocol";
import { toDomainContext } from "@/lib/leads/context";
import {
  findLeadsForOwnerAi,
  getLeadDashboardForOwnerAi,
  getRiskLeadsForOwnerAi,
} from "@/lib/leads/service";
import {
  getExpiringQuotesForOwnerAi,
  getQuoteSummaryForOwnerAi,
  searchQuotesForOwnerAi,
} from "@/lib/quotes/service";
import {
  findDocumentsForOwnerAi,
  getDocument,
  getDocumentSummaryForOwnerAi,
  getQuoteDocumentForOwnerAi,
} from "@/lib/documents";
import {
  getErpOverview,
  getOrder as getErpOrder,
  inventoryListSchema,
  listInventory,
  listOrders,
  listProducts as listErpProducts,
  orderListSchema,
  productListSchema,
} from "@/lib/erp";

import {
  getOrCreateConversation,
  appendMessage,
  startRun,
  endRun,
  addAuditEvent,
  addToolCall,
  proposeAction,
  listApprovals,
  markActionResult,
  assertOwnerAiHistoryCapacity,
  withPersistentAuditStore,
} from "./audit";
import { buildSystemPrompt, PROMPT_VERSION } from "./prompt";
import { dispatchTool, summarizeToolResult, AVAILABLE_TOOL_NAMES } from "./tools";
import { offlineRespond } from "./offline";
import type {
  Approval,
  OwnerAiMessage,
  OwnerAiResponse,
  ProposedAction,
  ToolCallRecord,
} from "./types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TOOL_TURNS = 3; // cap tool-calling loop depth
const MAX_TOOL_CALLS_PER_TURN = 4; // cap parallel tool calls per LLM response
const ownerAiRequestSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(20_000),
        }).strict(),
      )
      .min(1)
      .max(50),
    conversationId: z.string().regex(/^[A-Za-z0-9_-]+$/).max(128).optional(),
    mode: z.enum(["OBSERVE", "ASSIST", "AUTO"]).default("ASSIST"),
    activeModule: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(64).default("dashboard"),
  })
  .strict()
  .refine((value) => value.messages.at(-1)?.role === "user", {
    message: "The final message must be from the user",
    path: ["messages"],
  });

type OwnerAiInput = z.infer<typeof ownerAiRequestSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function dispatchAuthorizedTool(
  context: AuthContext,
  name: string,
  args: Record<string, unknown>,
) {
  const startedAt = performance.now();
  const domainContext = toDomainContext(context, { initiatedBy: "owner_ai" });
  if (name === "getSalesSummary") {
    return { result: await getLeadDashboardForOwnerAi(domainContext), durationMs: Math.round(performance.now() - startedAt) };
  }
  if (name === "getRiskLeads") {
    return { result: await getRiskLeadsForOwnerAi(domainContext), durationMs: Math.round(performance.now() - startedAt) };
  }
  if (name === "getQuoteSummary") {
    return { result: await getQuoteSummaryForOwnerAi(domainContext), durationMs: Math.round(performance.now() - startedAt) };
  }
  if (name === "getExpiringQuotes") {
    const requested = typeof args.days === "number" ? args.days : Number(args.days ?? 7);
    const days = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 365) : 7;
    const quotes = await getExpiringQuotesForOwnerAi(domainContext, days);
    return { result: { days, count: quotes.length, quotes }, durationMs: Math.round(performance.now() - startedAt) };
  }
  if (name === "getDocumentSummary") {
    return { result: await getDocumentSummaryForOwnerAi(domainContext), durationMs: Math.round(performance.now() - startedAt) };
  }
  if (name === "findDocuments") {
    const query = typeof args.query === "string" ? args.query.trim() : "";
    if (!query) throw new ApiError(422, "INVALID_TOOL_INPUT", "Search query is required");
    const documents = await findDocumentsForOwnerAi(domainContext, query);
    return { result: { query, count: documents.length, documents }, durationMs: Math.round(performance.now() - startedAt) };
  }
  if (name === "getDocumentMetadata" || name === "listDocumentVersions") {
    const documentId = typeof args.documentId === "string" ? args.documentId.trim() : "";
    if (!documentId) throw new ApiError(422, "INVALID_TOOL_INPUT", "Document id is required");
    const document = await getDocument(domainContext, documentId);
    const result = name === "listDocumentVersions" ? { documentId, versions: document.versions ?? [] } : document;
    return { result, durationMs: Math.round(performance.now() - startedAt) };
  }
  if (name === "getQuoteDocuments") {
    const quoteId = typeof args.quoteId === "string" ? args.quoteId.trim() : "";
    if (!quoteId) throw new ApiError(422, "INVALID_TOOL_INPUT", "Quote id is required");
    const documents = await getQuoteDocumentForOwnerAi(domainContext, quoteId);
    return { result: { quoteId, count: documents.length, documents }, durationMs: Math.round(performance.now() - startedAt) };
  }
  if (name === "findOrders") {
    const result = await listOrders(domainContext, orderListSchema.parse({
      limit: 20,
      ...(typeof args.query === "string" && args.query.trim() ? { q: args.query.trim() } : {}),
      ...(typeof args.status === "string" ? { status: args.status } : {}),
    }));
    return { result, durationMs: Math.round(performance.now() - startedAt) };
  }
  if (name === "getOrder" || name === "getPaymentStatus") {
    const orderId = typeof args.orderId === "string" ? args.orderId.trim() : "";
    if (!orderId) throw new ApiError(422, "INVALID_TOOL_INPUT", "Order id is required");
    const order = await getErpOrder(domainContext, orderId);
    return { result: name === "getPaymentStatus" ? { orderId, orderNumber: order.number, currency: order.currency, total: order.total, payments: order.payments } : order, durationMs: Math.round(performance.now() - startedAt) };
  }
  if (name === "getInventory") {
    const result = await listInventory(domainContext, inventoryListSchema.parse({
      limit: 50,
      ...(typeof args.query === "string" && args.query.trim() ? { q: args.query.trim() } : {}),
      ...(typeof args.warehouseId === "string" ? { warehouseId: args.warehouseId } : {}),
      ...(typeof args.availability === "string" ? { availability: args.availability } : {}),
    }));
    return { result, durationMs: Math.round(performance.now() - startedAt) };
  }
  if (name === "findProducts") {
    const result = await listErpProducts(domainContext, productListSchema.parse({
      limit: 50,
      ...(typeof args.query === "string" && args.query.trim() ? { q: args.query.trim() } : {}),
      ...(typeof args.type === "string" ? { type: args.type } : {}),
    }));
    return { result, durationMs: Math.round(performance.now() - startedAt) };
  }
  if (name === "getCustomerOrders") {
    const customerId = typeof args.customerId === "string" ? args.customerId.trim() : "";
    if (!customerId) throw new ApiError(422, "INVALID_TOOL_INPUT", "Customer id is required");
    const result = await listOrders(domainContext, orderListSchema.parse({ customerId, limit: 50 }));
    return { result, durationMs: Math.round(performance.now() - startedAt) };
  }
  if (name === "getErpOverview") {
    return { result: await getErpOverview(domainContext), durationMs: Math.round(performance.now() - startedAt) };
  }
  if (name === "searchGlobal") {
    const query = typeof args.query === "string" ? args.query.trim() : "";
    if (!query) throw new ApiError(422, "INVALID_TOOL_INPUT", "Search query is required");
    const [leads, quotes, documents] = await Promise.all([
      findLeadsForOwnerAi(domainContext, query),
      searchQuotesForOwnerAi(domainContext, query),
      findDocumentsForOwnerAi(domainContext, query),
    ]);
    return { result: { leads, quotes, documents }, durationMs: Math.round(performance.now() - startedAt) };
  }
  if (!ownerAiDemoEnabled()) {
    throw new ApiError(
      503,
      "TENANT_DATA_UNAVAILABLE",
      "Tenant read tools are not connected to persistent data",
    );
  }
  return dispatchTool(name, args);
}

/** Parse all ```tool-call ... ``` fenced blocks from an LLM response. */
function extractToolCalls(text: string): { tool: string; args: Record<string, unknown> }[] {
  const out: { tool: string; args: Record<string, unknown> }[] = [];
  const re = /```tool-call\s*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const json = m[1].trim();
    try {
      const parsed = JSON.parse(json);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.tool === "string" &&
        AVAILABLE_TOOL_NAMES.includes(parsed.tool)
      ) {
        out.push({
          tool: parsed.tool,
          args: (parsed.args && typeof parsed.args === "object" ? parsed.args : {}) as Record<string, unknown>,
        });
      }
    } catch {
      // skip malformed JSON
    }
  }
  return out;
}

/** Strip fenced tool-call and action blocks from an LLM response. */
function stripBlocks(text: string): string {
  return text
    .replace(/```tool-call\s*\n[\s\S]*?```/g, "")
    .replace(/```action\s*\n[\s\S]*?```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Build the OpenAI-compatible message array with an actual system boundary. */
function buildLlmMessages(
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[],
): OwnerAiChatMessage[] {
  const msgs: OwnerAiChatMessage[] = [{ role: "system", content: systemPrompt }];
  for (const h of history) {
    msgs.push({ role: h.role, content: h.content });
  }
  return msgs;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  return withTenantApi(req, {
    mutation: true,
    rateLimit: { scope: "owner-ai", limit: 30, windowMs: 10 * 60_000 },
  }, async (context) => {
    const body = await parseJson(req, ownerAiRequestSchema, 256 * 1024);
    if (body.mode === "AUTO" && !["OWNER", "ADMIN", "MANAGER"].includes(context.role)) {
      throw new ApiError(403, "FORBIDDEN", "Execute mode requires manager access");
    }
    if (body.mode !== "OBSERVE" && context.role === "VIEWER") {
      throw new ApiError(403, "FORBIDDEN", "Viewer access is read-only");
    }

    if (body.conversationId) {
      const conversation = await getDb().aiConversation.findFirst({
        where: {
          id: body.conversationId,
          orgId: context.orgId,
          userId: context.userId,
        },
        select: { id: true },
      });
      if (!conversation) {
        throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation not found");
      }
    }

    await assertOwnerAiHistoryCapacity(context.orgId, context.userId);

    return withPersistentAuditStore(
      {
        orgId: context.orgId,
        userId: context.userId,
        focusConversationId: body.conversationId,
      },
      () => runOwnerAi(body, context),
    );
  });
}

async function runOwnerAi(body: OwnerAiInput, context: AuthContext) {
  const orgId = context.orgId;
  const org = context.organizations.find((candidate) => candidate.id === orgId);
  if (!org) throw new ApiError(401, "INVALID_SESSION", "Active organization is unavailable");
  const mode = body.mode;
  const activeModule = body.activeModule;

  // 1. Get or create the conversation.
  const conv = getOrCreateConversation(orgId, mode, body.conversationId);

  // 2. Append the user's new message.
  const lastUser = body.messages[body.messages.length - 1];
  if (lastUser && lastUser.role === "user") {
    const userMsg: OwnerAiMessage = {
      id: uid("oa_msg"),
      role: "user",
      content: lastUser.content,
      ts: nowIso(),
    };
    appendMessage(conv.id, userMsg);
  }

  // 3. Start a new agent run.
  const run = startRun({
    conversationId: conv.id,
    mode,
    provider: "openai-compatible", // tentative — development may use the offline fallback
  });

  const toolCallRecords: ToolCallRecord[] = [];
  const actionRecords: ProposedAction[] = [];
  const toolCallIds: string[] = [];
  const actionIds: string[] = [];
  const approvalIds: string[] = [];

  // 4. Try the LLM.
  let online = false;
  let model: string | undefined;
  let llmError: string | undefined;
  let providerError: unknown;
  let finalContent = "";

  const systemPrompt = buildSystemPrompt({
    orgId: org.id,
    orgName: org.name,
    mode,
    activeModule,
  });

  // Build the LLM history from the conversation messages (excluding the new
  // user message we just appended — we'll pass it as the last message).
  const history = conv.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));

  try {
    // Tool-call loop: ask the LLM, parse tool-call blocks, run tools, append
    // tool results, ask again. Cap at MAX_TOOL_TURNS.
    let turn = 0;
    let pendingToolCalls: { tool: string; args: Record<string, unknown> }[] = [];
    let lastAssistantText = "";

    // working history copy — extended as we go
    const workHistory = [...history];

    do {
      turn++;
      addAuditEvent({
        runId: run.id,
        conversationId: conv.id,
        type: "llm_request",
        message: `LLM request turn ${turn} (${workHistory.length} messages)`,
        payload: { turn, messageCount: workHistory.length },
        correlationId: run.correlationId,
        promptVersion: PROMPT_VERSION,
        provider: "openai-compatible",
      });

      const resp = await createOwnerAiCompletion(
        buildLlmMessages(systemPrompt, workHistory),
      );
      lastAssistantText = resp.choices?.[0]?.message?.content ?? "";
      model = resp.model ?? "glm-4-plus";
      online = true;

      addAuditEvent({
        runId: run.id,
        conversationId: conv.id,
        type: "llm_response",
        message: `LLM response turn ${turn} (${lastAssistantText.length} chars, model=${model})`,
        payload: { turn, length: lastAssistantText.length, model },
        correlationId: run.correlationId,
        promptVersion: PROMPT_VERSION,
        provider: "openai-compatible",
        model,
      });

      // Parse any tool-call blocks.
      pendingToolCalls = extractToolCalls(lastAssistantText).slice(0, MAX_TOOL_CALLS_PER_TURN);

      if (pendingToolCalls.length > 0) {
        // Run the tools, build a tool-result message, append to workHistory,
        // and let the LLM compose a final answer in the next turn.
        const toolResultLines: string[] = [];
        for (const tc of pendingToolCalls) {
          try {
            const { result, durationMs } = await dispatchAuthorizedTool(context, tc.tool, tc.args);
            const { summary, count, preview } = summarizeToolResult(tc.tool, result);
            const rec = addToolCall({
              conversationId: conv.id,
              runId: run.id,
              name: tc.tool,
              args: tc.args,
              resultSummary: summary,
              resultPreview: preview,
              resultCount: count,
              durationMs,
            });
            toolCallRecords.push(rec);
            toolCallIds.push(rec.id);
            toolResultLines.push("```tool-result");
            toolResultLines.push(JSON.stringify({ tool: tc.tool, summary, count, result }, null, 2));
            toolResultLines.push("```");
          } catch (e) {
            toolResultLines.push("```tool-result");
            toolResultLines.push(JSON.stringify({ tool: tc.tool, error: (e as Error).message }, null, 2));
            toolResultLines.push("```");
          }
        }
        // Append the assistant turn (with tool-call blocks) + a synthetic user turn with the tool results.
        workHistory.push({ role: "assistant", content: lastAssistantText });
        workHistory.push({
          role: "user",
          content: `Here are the tool results. Please compose your final answer using ONLY these results. Do not emit more tool-call blocks.\n\n${toolResultLines.join("\n")}`,
        });
      } else {
        // No tool calls — lastAssistantText is the final answer.
        break;
      }
    } while (turn < MAX_TOOL_TURNS);

    finalContent = stripBlocks(lastAssistantText);

    // If we exhausted the loop with pending tool calls, note it.
    if (pendingToolCalls.length > 0 && turn >= MAX_TOOL_TURNS) {
      finalContent = (finalContent || "(The tool budget was exhausted.)") +
        `\n\n_Note: hit the ${MAX_TOOL_TURNS}-turn tool-call cap. Ask a narrower question if you need more depth._`;
    }

    // Parse any action blocks from the final assistant text.
    const proposedActions = executableOwnerAiActions(mode, lastAssistantText);
    const blockedActionCount = mode === "OBSERVE"
      ? extractOwnerAiActions(lastAssistantText).length
      : 0;
    if (blockedActionCount > 0) {
      addAuditEvent({
        runId: run.id,
        conversationId: conv.id,
        type: "error",
        message: "Blocked model-proposed actions in OBSERVE mode",
        payload: { blockedActionCount },
        correlationId: run.correlationId,
        promptVersion: PROMPT_VERSION,
        provider: "openai-compatible",
        model,
      });
    }
    for (const ap of proposedActions) {
      const act = proposeAction({
        conversationId: conv.id,
        runId: run.id,
        action: ap.action,
        args: ap.args,
      });
      actionRecords.push(act);
      actionIds.push(act.id);
      if (act.status === "pending_approval" && typeof act.args.__approvalId === "string") {
        approvalIds.push(act.args.__approvalId as string);
      }
    }

  } catch (e) {
    if (e instanceof OwnerAiActionLimitError) {
      endRun(run.id, "failed", "OWNER_AI_ACTION_LIMIT_EXCEEDED");
      throw new ApiError(
        502,
        "OWNER_AI_ACTION_LIMIT_EXCEEDED",
        `Owner AI returned more than ${MAX_OWNER_AI_ACTIONS_PER_RUN} actions; nothing was executed`,
      );
    }
    providerError = e;
    llmError = (e as Error).message || String(e);
    addAuditEvent({
      runId: run.id,
      conversationId: conv.id,
      type: "error",
      message: `LLM call failed: ${llmError}`,
      payload: { error: llmError },
      correlationId: run.correlationId,
      promptVersion: PROMPT_VERSION,
    });
  }

  // 5. If the LLM failed or returned empty, fall back to offline mode.
  if (!online || !finalContent.trim()) {
    const demoEnabled = ownerAiDemoEnabled();
    if (!demoEnabled) {
      endRun(run.id, "failed", "OWNER_AI_PROVIDER_UNAVAILABLE");
      if (
        providerError instanceof ApiError &&
        providerError.code === "OWNER_AI_PROVIDER_NOT_CONFIGURED"
      ) {
        throw providerError;
      }
      throw new ApiError(
        503,
        "OWNER_AI_PROVIDER_UNAVAILABLE",
        "Owner AI is temporarily unavailable",
      );
    }
    addAuditEvent({
      runId: run.id,
      conversationId: conv.id,
      type: "offline_fallback",
      message: `Falling back to offline engine (online=${online})`,
      payload: { online, error: llmError },
      correlationId: run.correlationId,
      promptVersion: PROMPT_VERSION,
    });
    const result = await offlineRespond(lastUser.content, {
      conversationId: conv.id,
      runId: run.id,
      mode,
      allowDemoData: demoEnabled,
      dispatchRead: (name, args) => dispatchAuthorizedTool(context, name, args),
    });
    finalContent = result.content;
    toolCallRecords.push(...result.toolCalls);
    for (const tc of result.toolCalls) toolCallIds.push(tc.id);
    for (const ap of result.proposedActions) {
      actionRecords.push(ap);
      actionIds.push(ap.id);
      if (ap.status === "pending_approval" && typeof ap.args.__approvalId === "string") {
        approvalIds.push(ap.args.__approvalId as string);
      }
    }
    run.provider = "offline-fallback";
    run.offline = true;
    run.model = undefined;
  }

  for (const action of actionRecords.filter(
    (candidate) => candidate.safety === "safe" && candidate.status === "proposed",
  )) {
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

  const executedSafe = actionRecords.filter(
    (action) => action.safety === "safe" && action.status === "executed",
  );
  if (executedSafe.length > 0) {
    const summary = executedSafe
      .map((action) => `- ✅ **${action.action}** executed: ${action.result}`)
      .join("\n");
    finalContent = `${finalContent}\n\n**Actions taken:**\n${summary}`;
  }

  // 6. Append the assistant message to the conversation.
  const assistantMsg: OwnerAiMessage = {
    id: uid("oa_msg"),
    role: "assistant",
    content: finalContent,
    toolCallIds,
    actionIds,
    approvalIds,
    ts: nowIso(),
    offline: run.offline,
  };
  appendMessage(conv.id, assistantMsg);

  // 7. End the run.
  endRun(run.id, run.offline ? "offline" : "succeeded", llmError);

  // 8. Build the response.
  const pendingApprovals: Approval[] = approvalIds
    .map((id) => listApprovals().find((a) => a.id === id))
    .filter((a): a is Approval => !!a && a.status === "pending");

  const response: OwnerAiResponse = {
    conversationId: conv.id,
    runId: run.id,
    correlationId: run.correlationId,
    message: assistantMsg,
    toolCalls: toolCallRecords,
    proposedActions: actionRecords,
    pendingApprovals,
    online: !run.offline,
    provider: run.provider,
    model: run.model,
    error: llmError,
  };

  return NextResponse.json(response);
}
