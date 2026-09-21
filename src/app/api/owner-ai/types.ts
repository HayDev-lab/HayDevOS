/**
 * Owner AI — shared types (server + client).
 *
 * These mirror what the API route emits and what the Zustand store on the
 * client consumes. Kept dependency-free so it can be imported from both
 * server and client code.
 */

export type OwnerAiMode = "OBSERVE" | "ASSIST" | "AUTO";

export type TimeWindow = "today" | "7d" | "30d" | "quarter";

export type Provider = "z-ai-web-dev-sdk" | "offline-fallback";

export type AssistantMessageRole = "user" | "assistant";

/** A tool call recorded in the audit + surfaced in the chat UI. */
export interface ToolCallRecord {
  id: string;
  /** Tool name, e.g. "getExecutiveSnapshot". */
  name: string;
  /** Raw args object the LLM proposed. */
  args: Record<string, unknown>;
  /** Short human summary of the result (e.g. "Returned 11 KPIs"). */
  resultSummary: string;
  /** Truncated JSON of the result payload (max ~2KB). */
  resultPreview: string;
  /** Number of items/rows in the result (when applicable). */
  resultCount?: number;
  /** Wall-clock duration in ms. */
  durationMs: number;
  /** ISO timestamp. */
  ts: string;
  /** Run this call belongs to. */
  runId: string;
  /** Conversation this call belongs to. */
  conversationId: string;
}

export type ActionStatus =
  | "proposed"
  | "executed"
  | "failed"
  | "pending_approval"
  | "approved"
  | "rejected";

export type ActionSafety = "safe" | "risky" | "forbidden";

/** A proposed or executed safe/risky action. */
export interface ProposedAction {
  id: string;
  /** Action name, e.g. "createTask" / "runApprovedAutomation". */
  action: string;
  /** Args object. */
  args: Record<string, unknown>;
  /** Safety classification. */
  safety: ActionSafety;
  /** Current status. */
  status: ActionStatus;
  /** Result message after execution (if any). */
  result?: string;
  /** ISO timestamp the action was proposed. */
  proposedAt: string;
  /** ISO timestamp the action was decided/executed (if any). */
  decidedAt?: string;
  /** User id who decided (for approvals). */
  decidedBy?: string;
  /** Reason given when rejecting. */
  reason?: string;
  /** Conversation this action belongs to. */
  conversationId: string;
  /** Run this action belongs to. */
  runId: string;
}

/** A pending approval (subset of ProposedAction with safety=risky). */
export interface Approval {
  id: string;
  action: string;
  args: Record<string, unknown>;
  /** Human-readable description. */
  description: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  reason?: string;
  conversationId: string;
  runId: string;
}

/** A chat message in a conversation. */
export interface OwnerAiMessage {
  id: string;
  role: AssistantMessageRole;
  content: string;
  /** Tool call ids made while producing this assistant message. */
  toolCallIds?: string[];
  /** Action ids proposed in this assistant message. */
  actionIds?: string[];
  /** Approval ids requested in this assistant message. */
  approvalIds?: string[];
  /** ISO timestamp. */
  ts: string;
  /** Whether this message was produced by the offline fallback. */
  offline?: boolean;
}

/** A conversation. */
export interface Conversation {
  id: string;
  orgId: string;
  mode: OwnerAiMode;
  title: string;
  messages: OwnerAiMessage[];
  createdAt: string;
  updatedAt: string;
}

/** An agent run — one POST /api/owner-ai invocation. */
export interface AgentRun {
  id: string;
  conversationId: string;
  mode: OwnerAiMode;
  status: "running" | "succeeded" | "failed" | "offline";
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  toolCallCount: number;
  actionCount: number;
  approvalCount: number;
  /** True if the offline fallback produced this run. */
  offline: boolean;
  /** Error message, if status=failed. */
  error?: string;
  /** Provider used (z-ai-web-dev-sdk or offline-fallback). */
  provider: Provider;
  /** Model id, when known. */
  model?: string;
  /** Correlation id (single id per run, propagated to all related records). */
  correlationId: string;
}

/** An audit event — granular log entry. */
export interface AuditEvent {
  id: string;
  /** Run this event belongs to. */
  runId: string;
  /** Conversation this event belongs to. */
  conversationId: string;
  /** Event type. */
  type:
    | "run_start"
    | "run_end"
    | "message_appended"
    | "tool_call"
    | "action_proposed"
    | "action_executed"
    | "approval_requested"
    | "approval_decided"
    | "llm_request"
    | "llm_response"
    | "offline_fallback"
    | "error";
  /** ISO timestamp. */
  ts: string;
  /** Short message. */
  message: string;
  /** Optional structured payload. */
  payload?: Record<string, unknown>;
  /** Correlation id (same as the run). */
  correlationId: string;
  /** Prompt version. */
  promptVersion: string;
  /** Provider/model used for this event. */
  provider?: Provider;
  model?: string;
}

/** Public system configuration surfaced in the Settings tab. */
export interface OwnerAiSystemConfig {
  promptVersion: string;
  defaultMode: OwnerAiMode;
  provider: Provider;
  model: string | null;
  forbiddenActions: string[];
  factualityRules: string[];
  availableTools: { name: string; description: string; safe: boolean }[];
  availableActions: { name: string; description: string; safety: ActionSafety }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API request / response shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface OwnerAiRequest {
  messages: { role: AssistantMessageRole; content: string }[];
  conversationId?: string;
  mode: OwnerAiMode;
  orgId: string;
  /** Active module id at the time of the request (for context chip). */
  activeModule?: string;
}

export interface OwnerAiResponse {
  conversationId: string;
  runId: string;
  correlationId: string;
  /** The assistant message that was appended to the conversation. */
  message: OwnerAiMessage;
  /** Tool calls made during this run. */
  toolCalls: ToolCallRecord[];
  /** Actions proposed during this run. */
  proposedActions: ProposedAction[];
  /** Pending approvals from this run (subset of proposedActions). */
  pendingApprovals: Approval[];
  /** True if the LLM was used; false if offline fallback. */
  online: boolean;
  /** Provider used. */
  provider: Provider;
  /** Model id, when known. */
  model?: string;
  /** Error message, if any (non-fatal — fallback may still have answered). */
  error?: string;
}

export interface OwnerAiApproveRequest {
  approvalId: string;
  decision: "approved" | "rejected";
  reason?: string;
  decidedBy: string;
  orgId: string;
}

export interface OwnerAiApproveResponse {
  approval: Approval;
  action: ProposedAction;
  /** Updated conversation. */
  conversation: Conversation;
}

export interface OwnerAiStateResponse {
  conversations: Conversation[];
  agentRuns: AgentRun[];
  toolCalls: ToolCallRecord[];
  approvals: Approval[];
  actions: ProposedAction[];
  auditEvents: AuditEvent[];
  config: OwnerAiSystemConfig;
  /** Aggregate audit stats (counts + provider/mode/status breakdowns). */
  stats?: AuditStats;
}

/**
 * Aggregate audit stats — surfaced via GET /api/owner-ai/state for the UI's
 * Settings / Audit tabs. Computed by `getAuditStats()` in `./audit.ts`.
 */
export interface AuditStats {
  conversations: number;
  agentRuns: number;
  toolCalls: number;
  actions: number;
  approvals: number;
  auditEvents: number;
  pendingApprovals: number;
  approvedApprovals: number;
  rejectedApprovals: number;
  executedActions: number;
  failedActions: number;
  pendingApprovalActions: number;
  onlineRuns: number;
  offlineRuns: number;
  byProvider: Record<string, number>;
  byMode: Record<string, number>;
  byRunStatus: Record<string, number>;
  lastRunAt: string | null;
  lastEventAt: string | null;
}
