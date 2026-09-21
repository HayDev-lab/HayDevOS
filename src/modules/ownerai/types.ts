/**
 * Owner AI — client-side types.
 *
 * Re-exports the shared backend types (which are dependency-free) so the
 * frontend has a single import surface. Adds a few client-only convenience
 * types.
 */

export type {
  OwnerAiMode,
  TimeWindow,
  Provider,
  AssistantMessageRole,
  ToolCallRecord,
  ProposedAction,
  Approval,
  OwnerAiMessage,
  Conversation,
  AgentRun,
  AuditEvent,
  OwnerAiSystemConfig,
  ActionSafety,
  ActionStatus,
  OwnerAiRequest,
  OwnerAiResponse,
  OwnerAiApproveRequest,
  OwnerAiApproveResponse,
  OwnerAiStateResponse,
} from "@/app/api/owner-ai/types";

import type { OwnerAiMode, TimeWindow } from "@/app/api/owner-ai/types";

/** Quick-suggestion chips shown in the panel empty state + input area. */
export interface SuggestionChip {
  id: string;
  /** The literal text to send. */
  text: string;
  /** Optional icon key. */
  icon?: "attention" | "convert" | "risk" | "expiring" | "report" | "pipeline" | "health" | "timeline";
  /** Default window hint. */
  window?: TimeWindow;
}

export const SUGGESTION_CHIPS: SuggestionChip[] = [
  { id: "attention", text: "What needs attention today?", icon: "attention", window: "7d" },
  { id: "convert", text: "Why did conversion drop?", icon: "convert", window: "30d" },
  { id: "risk", text: "Which 5 deals are at risk?", icon: "risk" },
  { id: "expiring", text: "Which quotes expire this week?", icon: "expiring" },
  { id: "report", text: "Generate weekly report", icon: "report", window: "7d" },
  { id: "pipeline", text: "Pipeline summary for last 30 days", icon: "pipeline", window: "30d" },
  { id: "health", text: "Integration health check", icon: "health", window: "30d" },
  { id: "timeline", text: "Recent activity timeline", icon: "timeline", window: "7d" },
];

/** Default mode for new conversations. */
export const DEFAULT_MODE: OwnerAiMode = "ASSIST";

/** All three Owner AI modes (for the selector). */
export const MODES: OwnerAiMode[] = ["OBSERVE", "ASSIST", "AUTO"];
