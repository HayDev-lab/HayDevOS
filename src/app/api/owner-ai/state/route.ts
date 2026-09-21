/**
 * Owner AI — GET /api/owner-ai/state
 *
 * Returns the full in-memory audit state for the Owner AI module view:
 * conversations, agent runs, tool calls, approvals, actions, audit events,
 * and the public system config (prompt version, default mode, provider,
 * model, forbidden-actions list, factuality rules, available tools/actions).
 *
 * Used by the OwnerAiView's Conversations / Agent Runs / Tool Calls /
 * Approvals / Audit / Settings tabs.
 */

import { NextResponse } from "next/server";

import {
  listConversations,
  listAgentRuns,
  listToolCalls,
  listApprovals,
  listActions,
  listAuditEvents,
  getSystemConfig,
  getAuditStats,
} from "../audit";
import type { OwnerAiStateResponse } from "../types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cached provider/model detection (run once per server process).
let cachedProvider: "z-ai-web-dev-sdk" | "offline-fallback" | null = null;
let cachedModel: string | null = null;

async function detectProvider(): Promise<{
  provider: "z-ai-web-dev-sdk" | "offline-fallback";
  model: string | null;
}> {
  if (cachedProvider !== null) {
    return { provider: cachedProvider, model: cachedModel };
  }
  try {
    const ZAIModule = await import("z-ai-web-dev-sdk");
    const ZAI = ZAIModule.default;
    const zai = await ZAI.create();
    const resp = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: "Reply with the word ok." },
        { role: "user", content: "ok?" },
      ],
      stream: false,
      thinking: { type: "disabled" },
    });
    const model = (resp as { model?: string }).model ?? "glm-4-plus";
    cachedProvider = "z-ai-web-dev-sdk";
    cachedModel = model;
    return { provider: cachedProvider, model: cachedModel };
  } catch {
    cachedProvider = "offline-fallback";
    cachedModel = null;
    return { provider: cachedProvider, model: cachedModel };
  }
}

export async function GET() {
  const { provider, model } = await detectProvider();
  const config = getSystemConfig(provider, model);

  const response: OwnerAiStateResponse = {
    conversations: listConversations(),
    agentRuns: listAgentRuns(),
    toolCalls: listToolCalls(),
    approvals: listApprovals(),
    actions: listActions(),
    auditEvents: listAuditEvents(),
    config,
    stats: getAuditStats(),
  };
  return NextResponse.json(response);
}
