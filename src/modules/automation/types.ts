/**
 * HayDevOS Automation Builder — typed domain model.
 *
 * Philosophy: WHEN → IF → THEN → EXECUTE → RETRY → OBSERVE → AUDIT.
 * These types are the contract between the visual builder, the in-memory
 * mock data layer (data.ts) and every sub-view.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Triggers / Conditions / Actions
// ─────────────────────────────────────────────────────────────────────────────

export type TriggerType =
  | "lead_created"
  | "lead_stage_changed"
  | "task_due"
  | "quote_sent"
  | "quote_accepted"
  | "document_uploaded"
  | "document_approved"
  | "manual"
  | "schedule"
  | "webhook";

export type ConditionOp =
  | "equals"
  | "not_equals"
  | "contains"
  | "gt"
  | "lt"
  | "in"
  | "between";

export type ActionType =
  | "create_task"
  | "assign_lead"
  | "set_priority"
  | "add_note"
  | "schedule_followup"
  | "send_notification"
  | "send_email"
  | "send_telegram"
  | "send_webhook"
  | "create_quote"
  | "start_document_workflow"
  | "run_ai_agent"
  | "update_field";

export type AutomationStatus = "draft" | "active" | "paused";

export interface Trigger {
  type: TriggerType;
  config: Record<string, unknown>;
}

export interface Condition {
  id: string;
  field: string;
  op: ConditionOp;
  value: unknown;
}

export interface Action {
  id: string;
  type: ActionType;
  config: Record<string, unknown>;
  requiresApproval?: boolean;
}

export interface Automation {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  trigger: Trigger;
  conditions: Condition[];
  actions: Action[];
  status: AutomationStatus;
  version: number;
  /** Loop protection — max nested re-entries before the engine halts. */
  maxDepth: number;
  /** Dedup key template, e.g. "lead:{lead.id}" — collapses re-fires. */
  dedupKey: string;
  /** Reentry policy: allow | block | queue. */
  reentryPolicy: "allow" | "block" | "queue";
  runs: {
    total: number;
    success: number;
    failed: number;
    lastRunAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution timeline
// ─────────────────────────────────────────────────────────────────────────────

export type RunStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "awaiting_approval"
  | "cancelled";

export type StepKind = "trigger" | "condition" | "action";
export type StepStatus =
  | "success"
  | "failed"
  | "skipped"
  | "running"
  | "awaiting_approval"
  | "retried";

export interface ExecutionStep {
  id: string;
  kind: StepKind;
  label: string;
  status: StepStatus;
  durationMs: number;
  /** Retry attempts for this step (0 = first try succeeded). */
  retries: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error?: string;
}

export interface AutomationRun {
  id: string;
  orgId: string;
  automationId: string;
  automationName: string;
  status: RunStatus;
  triggerSource: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number;
  /** Idempotency key — replay-safe identifier derived from dedup template. */
  idempotencyKey: string;
  /** Causation id — the event / parent run that fired this one. */
  causationId: string;
  /** Worker that executed the run. */
  worker: string;
  /** Last heartbeat ISO timestamp (null when finished). */
  heartbeatAt: string | null;
  steps: ExecutionStep[];
  errorMessage?: string;
  errorType?: string;
  retryCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────────────

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: "lead" | "quote" | "document" | "schedule" | "notification" | "finance";
  trigger: Trigger;
  conditions: Omit<Condition, "id">[];
  actions: Omit<Action, "id">[];
  installs: number;
  rating: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Approvals
// ─────────────────────────────────────────────────────────────────────────────

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export interface Approval {
  id: string;
  orgId: string;
  automationId: string;
  automationName: string;
  runId: string;
  actionType: ActionType;
  actionLabel: string;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
  decidedBy?: string;
  decidedAt?: string;
  /** The payload snapshot at request time — used to detect "stale context". */
  contextSnapshot: Record<string, unknown>;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedules
// ─────────────────────────────────────────────────────────────────────────────

export interface Schedule {
  id: string;
  orgId: string;
  automationId: string;
  automationName: string;
  cron: string;
  timezone: string;
  nextRunAt: string;
  lastRunAt: string | null;
  status: "active" | "paused";
  lastDurationMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhooks
// ─────────────────────────────────────────────────────────────────────────────

export interface WebhookEndpoint {
  id: string;
  orgId: string;
  name: string;
  url: string;
  signingSecretMasked: string;
  eventTypes: string[];
  lastDeliveryAt: string | null;
  lastStatus: "delivered" | "failed" | "pending" | null;
  deliveries24h: number;
  successRate: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Variables
// ─────────────────────────────────────────────────────────────────────────────

export interface AutomationVariable {
  id: string;
  orgId: string;
  key: string;
  value: string;
  isSecret: boolean;
  scope: "org" | "automation";
  automationId?: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Workers
// ─────────────────────────────────────────────────────────────────────────────

export type WorkerStatus = "online" | "offline" | "draining";

export interface Worker {
  id: string;
  name: string;
  status: WorkerStatus;
  currentJob: string | null;
  queueDepth: number;
  heartbeatAt: string;
  region: string;
  jobsProcessed: number;
  cpuPct: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine settings
// ─────────────────────────────────────────────────────────────────────────────

export interface EngineSettings {
  loopProtection: {
    maxDepth: number;
    reentryPolicy: "allow" | "block" | "queue";
    dedupTtlSec: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: "fixed" | "linear" | "exponential";
    initialDelayMs: number;
    maxDelayMs: number;
  };
  concurrency: {
    maxConcurrentRuns: number;
    perAutomationLimit: number;
    queueTimeoutMs: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers (labels for the visual builder select dropdowns)
// ─────────────────────────────────────────────────────────────────────────────

export const TRIGGER_TYPES: TriggerType[] = [
  "lead_created",
  "lead_stage_changed",
  "task_due",
  "quote_sent",
  "quote_accepted",
  "document_uploaded",
  "document_approved",
  "manual",
  "schedule",
  "webhook",
];

export const CONDITION_OPS: ConditionOp[] = [
  "equals",
  "not_equals",
  "contains",
  "gt",
  "lt",
  "in",
  "between",
];

export const ACTION_TYPES: ActionType[] = [
  "create_task",
  "assign_lead",
  "set_priority",
  "add_note",
  "schedule_followup",
  "send_notification",
  "send_email",
  "send_telegram",
  "send_webhook",
  "create_quote",
  "start_document_workflow",
  "run_ai_agent",
  "update_field",
];

/** Actions that touch the outside world or mutate money — approval ON by default. */
export const RISKY_ACTIONS: ActionType[] = [
  "send_email",
  "send_telegram",
  "send_webhook",
  "create_quote",
  "run_ai_agent",
];

export function isRiskyAction(type: ActionType): boolean {
  return RISKY_ACTIONS.includes(type);
}
