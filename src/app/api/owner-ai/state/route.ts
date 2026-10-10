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

import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import {
  ownerAiDemoEnabled,
  ownerAiProviderConfigured,
  ownerAiProviderName,
} from "@/lib/owner-ai/provider";

import {
  listConversations,
  listAgentRuns,
  listToolCalls,
  listApprovals,
  listActions,
  listAuditEvents,
  getSystemConfig,
  getAuditStats,
  withPersistentAuditStore,
} from "../audit";
import type { OwnerAiStateResponse } from "../types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function detectProvider(): {
  provider: "openai-compatible" | "openclaw-broker" | "offline-fallback" | "unavailable";
  model: string | null;
} {
  if (ownerAiProviderConfigured()) {
    return {
      provider: ownerAiProviderName(),
      model: ownerAiProviderName() === "openai-compatible" ? process.env.OWNER_AI_MODEL!.trim() : process.env.HAYDEV_OPENCLAW_AGENT_TARGET?.trim() || "openclaw/default",
    };
  }
  if (ownerAiDemoEnabled()) {
    return { provider: "offline-fallback", model: null };
  }
  return { provider: "unavailable", model: null };
}

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (context) =>
    withPersistentAuditStore(
      {
        orgId: context.orgId,
        userId: context.userId,
        scope: ["OWNER", "ADMIN"].includes(context.role) ? "tenant" : "user",
      },
      async () => {
        const { provider, model } = detectProvider();
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
      },
    ),
  );
}
