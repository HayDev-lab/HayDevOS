/**
 * Owner AI — client-side Zustand store.
 *
 * Owns the conversation history, current mode, pending approvals, agent runs,
 * tool calls, audit events, and system config. The slide-in OwnerAiPanel and
 * the full-page OwnerAiView both consume this store so they stay in sync.
 *
 * The store talks to the backend via fetch:
 *   - sendMessage(text) → POST /api/owner-ai
 *   - decideApproval(id, decision) → POST /api/owner-ai/approve
 *   - refreshState() → GET /api/owner-ai/state
 *   - resetAudit() → POST /api/owner-ai/reset
 */

"use client";

import { create } from "zustand";
import type {
  AgentRun,
  Approval,
  AuditEvent,
  Conversation,
  OwnerAiMessage,
  OwnerAiMode,
  OwnerAiResponse,
  OwnerAiStateResponse,
  OwnerAiSystemConfig,
  ProposedAction,
  ToolCallRecord,
} from "@/app/api/owner-ai/types";
import { DEFAULT_MODE } from "./types";

interface OwnerAiState {
  // Conversation state
  conversations: Conversation[];
  activeConversationId: string | null;
  mode: OwnerAiMode;

  // Per-run records
  agentRuns: AgentRun[];
  toolCalls: ToolCallRecord[];
  approvals: Approval[];
  actions: ProposedAction[];
  auditEvents: AuditEvent[];

  // System config (from GET /state)
  config: OwnerAiSystemConfig | null;

  // UI state
  isProcessing: boolean;
  /** True after we've talked to /state at least once. */
  initialized: boolean;
  /** Last error from the API (non-fatal — fallback handles it). */
  lastError: string | null;

  // Actions
  init: () => Promise<void>;
  refreshState: () => Promise<void>;
  setMode: (mode: OwnerAiMode) => void;
  newConversation: () => void;
  selectConversation: (id: string | null) => void;
  sendMessage: (text: string, orgId: string, activeModule?: string) => Promise<void>;
  decideApproval: (
    approvalId: string,
    decision: "approved" | "rejected",
    decidedBy: string,
    reason?: string,
  ) => Promise<void>;
  resetAudit: () => Promise<void>;
}

function getActiveConversation(state: OwnerAiState): Conversation | undefined {
  if (!state.activeConversationId) return undefined;
  return state.conversations.find((c) => c.id === state.activeConversationId);
}

/** Merge a run response into the store. */
function applyResponse(state: OwnerAiState, resp: OwnerAiResponse): Partial<OwnerAiState> {
  // Update or insert the conversation.
  const conversations = [...state.conversations];
  const idx = conversations.findIndex((c) => c.id === resp.conversationId);
  if (idx >= 0) {
    const existing = conversations[idx];
    const existingMsgIds = new Set(existing.messages.map((m) => m.id));
    const newMessages = resp.message && !existingMsgIds.has(resp.message.id)
      ? [...existing.messages, resp.message]
      : existing.messages;
    conversations[idx] = {
      ...existing,
      messages: newMessages,
      updatedAt: resp.message.ts,
    };
  }

  // Index the new tool calls / actions / approvals.
  const toolCalls = [...state.toolCalls];
  for (const tc of resp.toolCalls) {
    if (!toolCalls.find((t) => t.id === tc.id)) toolCalls.unshift(tc);
  }
  const actions = [...state.actions];
  for (const ap of resp.proposedActions) {
    if (!actions.find((a) => a.id === ap.id)) actions.unshift(ap);
  }
  const approvals = [...state.approvals];
  for (const ap of resp.pendingApprovals) {
    if (!approvals.find((a) => a.id === ap.id)) approvals.unshift(ap);
  }

  // The run record we get from the response is partial — refresh from /state
  // to get the full AgentRun. For now, optimistically add a placeholder.
  const agentRuns = [...state.agentRuns];
  // (We don't insert the run here; refreshState() will sync it.)

  return {
    conversations,
    toolCalls,
    actions,
    approvals,
    agentRuns,
    activeConversationId: resp.conversationId,
    lastError: resp.error ?? null,
  };
}

export const useOwnerAiStore = create<OwnerAiState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  mode: DEFAULT_MODE,
  agentRuns: [],
  toolCalls: [],
  approvals: [],
  actions: [],
  auditEvents: [],
  config: null,
  isProcessing: false,
  initialized: false,
  lastError: null,

  init: async () => {
    if (get().initialized) return;
    await get().refreshState();
    set({ initialized: true });
  },

  refreshState: async () => {
    try {
      const res = await fetch("/api/owner-ai/state", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as OwnerAiStateResponse;
      set({
        conversations: data.conversations,
        agentRuns: data.agentRuns,
        toolCalls: data.toolCalls,
        approvals: data.approvals,
        actions: data.actions,
        auditEvents: data.auditEvents,
        config: data.config,
        // If we have conversations but no active id, pick the most-recent.
        activeConversationId:
          get().activeConversationId ??
          (data.conversations.length > 0 ? data.conversations[0].id : null),
      });
    } catch {
      // Network errors are non-fatal — the chat will still work locally.
    }
  },

  setMode: (mode) => set({ mode }),

  newConversation: () => {
    set({ activeConversationId: null });
  },

  selectConversation: (id) => set({ activeConversationId: id }),

  sendMessage: async (text, orgId, activeModule) => {
    const trimmed = text.trim();
    if (!trimmed || get().isProcessing) return;

    const state = get();
    const conv = getActiveConversation(state);
    const mode = state.mode;

    // Optimistically append the user message to the local conversation so the
    // UI shows it immediately. The server will also append it (and dedupe by
    // id when we refreshState).
    const tempUserId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tempUserMsg: OwnerAiMessage = {
      id: tempUserId,
      role: "user",
      content: trimmed,
      ts: new Date().toISOString(),
    };
    const tempAssistantId = `local_pending_${Date.now()}`;
    const tempAssistantMsg: OwnerAiMessage = {
      id: tempAssistantId,
      role: "assistant",
      content: "",
      ts: new Date().toISOString(),
    };

    let conversations = [...state.conversations];
    if (conv) {
      const idx = conversations.findIndex((c) => c.id === conv.id);
      if (idx >= 0) {
        conversations[idx] = {
          ...conv,
          messages: [...conv.messages, tempUserMsg, tempAssistantMsg],
          updatedAt: tempUserMsg.ts,
        };
      }
    } else {
      // New conversation (the server will create it).
      const newConv: Conversation = {
        id: `local_${Date.now()}`,
        orgId,
        mode,
        title: trimmed.length > 48 ? trimmed.slice(0, 48) + "…" : trimmed,
        messages: [tempUserMsg, tempAssistantMsg],
        createdAt: tempUserMsg.ts,
        updatedAt: tempUserMsg.ts,
      };
      conversations = [newConv, ...conversations];
      set({ activeConversationId: newConv.id });
    }
    set({ conversations, isProcessing: true, lastError: null });

    try {
      // Build the messages payload from the canonical conversation (excluding
      // the placeholder assistant message and any local-only messages).
      const canonicalConv = conv
        ? { ...conv, messages: conv.messages.filter((m) => !m.id.startsWith("local_")) }
        : { messages: [] as OwnerAiMessage[] };
      const history = [
        ...canonicalConv.messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: trimmed },
      ];

      const res = await fetch("/api/owner-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          conversationId: conv?.id,
          mode,
          orgId,
          activeModule,
        } as OwnerAiRequest),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${errText || res.statusText}`);
      }

      const resp = (await res.json()) as OwnerAiResponse;

      // Replace the placeholder assistant message with the real one.
      const after = get();
      let convs = [...after.conversations];
      // First remove the temp user + assistant messages from the active conv.
      const activeId = after.activeConversationId;
      const idx = convs.findIndex((c) => c.id === activeId || c.id === resp.conversationId);
      if (idx >= 0) {
        const c = convs[idx];
        const cleaned = c.messages.filter((m) => !m.id.startsWith("local_"));
        // If the active conv id was a local placeholder, rename it to the
        // real conversation id.
        const newId = c.id.startsWith("local_") ? resp.conversationId : c.id;
        const existing = resp.message && !cleaned.find((m) => m.id === resp.message.id)
          ? [...cleaned, tempUserMsg, resp.message]
          : [...cleaned, tempUserMsg];
        convs[idx] = {
          ...c,
          id: newId,
          messages: existing,
          updatedAt: resp.message.ts,
          title: c.title === "New conversation" || c.title.startsWith("New")
            ? (trimmed.length > 48 ? trimmed.slice(0, 48) + "…" : trimmed)
            : c.title,
        };
      }
      set({ conversations: convs });

      // Apply the rest of the response (tool calls, actions, approvals).
      const merged = applyResponse(get(), resp);
      set({ ...merged, isProcessing: false });

      // Refresh full state to pick up the new run record + audit events.
      // Fire-and-forget — don't block the UI.
      void get().refreshState();
    } catch (e) {
      const msg = (e as Error).message || String(e);
      // Replace the placeholder assistant message with an error note.
      const after = get();
      const convs = [...after.conversations];
      const idx = convs.findIndex((c) => c.id === after.activeConversationId);
      if (idx >= 0) {
        const c = convs[idx];
        convs[idx] = {
          ...c,
          messages: c.messages.map((m) =>
            m.id === tempAssistantId
              ? {
                  ...m,
                  content: `⚠️ I couldn't reach the API: ${msg}. Please try again.`,
                }
              : m,
          ),
        };
      }
      set({ conversations: convs, isProcessing: false, lastError: msg });
    }
  },

  decideApproval: async (approvalId, decision, decidedBy, reason) => {
    try {
      const res = await fetch("/api/owner-ai/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          decision,
          decidedBy,
          reason,
        } as OwnerAiApproveRequest),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${errText || res.statusText}`);
      }
      // Refresh state to pick up the updated approval + action.
      await get().refreshState();
    } catch (e) {
      const msg = (e as Error).message || String(e);
      set({ lastError: msg });
    }
  },

  resetAudit: async () => {
    try {
      await fetch("/api/owner-ai/reset", { method: "POST" });
      set({
        conversations: [],
        activeConversationId: null,
        agentRuns: [],
        toolCalls: [],
        approvals: [],
        actions: [],
        auditEvents: [],
      });
    } catch {
      // ignore
    }
  },
}));

// Helper selectors (re-exported for components)
export function activeConversation(state: OwnerAiState): Conversation | undefined {
  return getActiveConversation(state);
}

// Type-only re-exports for the request types used in the store.
import type { OwnerAiRequest, OwnerAiApproveRequest } from "@/app/api/owner-ai/types";
