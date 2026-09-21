/**
 * Owner AI — POST /api/owner-ai
 *
 * Receives { messages, conversationId?, mode, orgId, activeModule? }, calls the
 * LLM via z-ai-web-dev-sdk with a system prompt defining the Owner AI role +
 * available read tools + safe actions, runs the tool-call loop, executes safe
 * actions, queues risky actions as approvals, and returns the assistant
 * response + tool calls + pending approvals.
 *
 * If the LLM SDK is unavailable (no API key, network error, etc.) or the
 * response can't be parsed, the route falls back to the deterministic offline
 * engine (`./offline.ts`) so the panel ALWAYS works for demo.
 *
 * The LLM is the ONLY place where z-ai-web-dev-sdk is imported — server-side
 * only, never client.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import type { ChatMessage } from "z-ai-web-dev-sdk";

import {
  getOrCreateConversation,
  appendMessage,
  startRun,
  endRun,
  addAuditEvent,
  addToolCall,
  proposeAction,
  listApprovals,
} from "./audit";
import { buildSystemPrompt, PROMPT_VERSION } from "./prompt";
import { dispatchTool, summarizeToolResult, AVAILABLE_TOOL_NAMES } from "./tools";
import { offlineRespond } from "./offline";
import type {
  Approval,
  OwnerAiMessage,
  OwnerAiRequest,
  OwnerAiResponse,
  ProposedAction,
  ToolCallRecord,
} from "./types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Inlined org lookup (do NOT import from the client-side app-store — its
// "use client" directive causes module-shape issues when imported by a server
// route). Keep these in sync with src/lib/store/app-store.ts MOCK_ORGS.
const ORGS = [
  { id: "org_haydev", name: "HayDev HQ", slug: "haydev-hq", plan: "enterprise" },
  { id: "org_demo", name: "Demo Corp", slug: "demo-corp", plan: "growth" },
];

const MAX_TOOL_TURNS = 3; // cap tool-calling loop depth
const MAX_TOOL_CALLS_PER_TURN = 4; // cap parallel tool calls per LLM response

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  // crypto.randomUUID is available in Node 18+ and Next.js 16 runtimes.
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function nowIso(): string {
  return new Date().toISOString();
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

/** Parse all ```action ... ``` fenced blocks from an LLM response. */
function extractActions(text: string): { action: string; args: Record<string, unknown> }[] {
  const out: { action: string; args: Record<string, unknown> }[] = [];
  const re = /```action\s*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const json = m[1].trim();
    try {
      const parsed = JSON.parse(json);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.action === "string"
      ) {
        out.push({
          action: parsed.action,
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

/** Build the chat message array the LLM expects (system as assistant role per SDK convention). */
function buildLlmMessages(
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[],
): ChatMessage[] {
  const msgs: ChatMessage[] = [{ role: "assistant", content: systemPrompt }];
  for (const h of history) {
    msgs.push({ role: h.role, content: h.content });
  }
  return msgs;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: OwnerAiRequest;
  try {
    body = (await req.json()) as OwnerAiRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages[] is required" }, { status: 400 });
  }

  const orgId = body.orgId ?? "org_haydev";
  const org = ORGS.find((o) => o.id === orgId) ?? ORGS[0];
  const mode = body.mode ?? "ASSIST";
  const activeModule = body.activeModule ?? "dashboard";

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
    provider: "z-ai-web-dev-sdk", // tentative — we'll update if offline fallback kicks in
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
    const zai = await ZAI.create();

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
        provider: "z-ai-web-dev-sdk",
      });

      const completion = await zai.chat.completions.create({
        messages: buildLlmMessages(systemPrompt, workHistory),
        stream: false,
        thinking: { type: "disabled" },
      });

      const resp = completion as {
        choices?: { message?: { content?: string } }[];
        model?: string;
      };
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
        provider: "z-ai-web-dev-sdk",
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
            const { result, durationMs } = dispatchTool(tc.tool, tc.args);
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
    const proposedActions = extractActions(lastAssistantText);
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

    // For safe actions that auto-executed, append the result inline to the message.
    const executedSafe = actionRecords.filter((a) => a.safety === "safe" && a.status === "executed");
    if (executedSafe.length > 0) {
      const summary = executedSafe
        .map((a) => `- ✅ **${a.action}** executed: ${a.result}`)
        .join("\n");
      finalContent = `${finalContent}\n\n**Actions taken:**\n${summary}`;
    }
  } catch (e) {
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
    addAuditEvent({
      runId: run.id,
      conversationId: conv.id,
      type: "offline_fallback",
      message: `Falling back to offline engine (online=${online})`,
      payload: { online, error: llmError },
      correlationId: run.correlationId,
      promptVersion: PROMPT_VERSION,
    });
    const result = offlineRespond(lastUser.content, {
      conversationId: conv.id,
      runId: run.id,
      mode,
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
