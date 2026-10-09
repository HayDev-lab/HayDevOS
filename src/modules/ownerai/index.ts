/**
 * HayDevOS Owner AI module — barrel export.
 *
 * Default + named export: `OwnerAiView`.
 *
 * Also re-exports the shared client store, the panel-side helpers
 * (`SUGGESTION_CHIPS`, `MODES`, `DEFAULT_MODE`), and the dependency-free
 * shared types from the backend's `types.ts` so consumers can import the
 * Owner AI surface from a single module.
 *
 * `OwnerAiView` is the component registered for the `ownerAi` module.
 */

export { OwnerAiView, OwnerAiView as default } from "./OwnerAiView";

// Shared state
export { useOwnerAiStore, activeConversation } from "./state";

// Constants
export { SUGGESTION_CHIPS, MODES, DEFAULT_MODE } from "./types";
export type { SuggestionChip } from "./types";

// Backend-shared types (re-export so the frontend has a single import surface)
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
  AuditStats,
} from "@/app/api/owner-ai/types";
