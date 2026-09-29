/**
 * Control — executive command center types.
 *
 * Every type here is consumed by `adapters.ts` (typed analytics/application
 * services) and the React views in `components/`. No raw cross-module joins
 * leak through — adapters project mock data into these typed shapes.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Time window
// ─────────────────────────────────────────────────────────────────────────────

export type TimeWindow = "today" | "7d" | "30d" | "quarter" | "custom";

export type ControlTranslator = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export interface WindowRange {
  /** Inclusive start (ms epoch). */
  startMs: number;
  /** Exclusive end (ms epoch) — typically Date.now(). */
  endMs: number;
  /** Window length in days (used for prior-period shift + sparkline buckets). */
  days: number;
  /** Prior-period start (same length, immediately before `startMs`). */
  priorStartMs: number;
  /** ISO label for header display. */
  labelKey: string;
}

export const WINDOW_OPTIONS: { id: TimeWindow; labelKey: string; days: number }[] = [
  { id: "today", labelKey: "control.window.today", days: 1 },
  { id: "7d", labelKey: "control.window.7d", days: 7 },
  { id: "30d", labelKey: "control.window.30d", days: 30 },
  { id: "quarter", labelKey: "control.window.quarter", days: 90 },
  { id: "custom", labelKey: "control.window.custom", days: 14 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Priority + attention items
// ─────────────────────────────────────────────────────────────────────────────

export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";

export type AttentionType =
  | "sla_breach"
  | "overdue_followup"
  | "stale_high_value_deal"
  | "expiring_quote"
  | "approval_pending"
  | "document_review"
  | "processing_failure"
  | "automation_failure"
  | "worker_backlog"
  | "integration_reauth"
  | "invoice_erp_alert"
  | "ai_approval";

export type SourceModule =
  | "leados"
  | "quoteflow"
  | "docsmart"
  | "autopilot"
  | "erphub"
  | "connect"
  | "ownerAi";

export interface AttentionItem {
  id: string;
  type: AttentionType;
  priority: Priority;
  title: string;
  body: string;
  source: SourceModule;
  /** Module id to drilldown into via `useAppStore.setActiveModule`. */
  moduleId: string;
  /** Entity reference for the source record (best-effort). */
  entityRef?: string;
  /** ISO timestamp of the underlying event (for due/age display). */
  ts: string;
  /** Whether this is a due date in the future, or an age in the past. */
  dueOrAge: "due" | "age";
}

// ─────────────────────────────────────────────────────────────────────────────
// AI insights
// ─────────────────────────────────────────────────────────────────────────────

export type InsightTone = "rose" | "amber" | "cyan" | "violet" | "lime";

export interface AiInsight {
  id: string;
  title: string;
  body: string;
  tone: InsightTone;
  /** Source module to drill into when the user takes action. */
  moduleId: string;
  /** Suggested action label (i18n key). */
  actionKey: string;
  /** Confidence 0..1 for the insight. */
  confidence: number;
  ts: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI card shape (used by every summary)
// ─────────────────────────────────────────────────────────────────────────────

export type KpiTone = "lime" | "cyan" | "amber" | "rose" | "violet";

export interface KpiCardData {
  id: string;
  /** i18n key for the label. */
  labelKey: string;
  /** Pre-formatted display value. */
  displayValue: string;
  /** Raw numeric value (for sorting / charts). */
  value: number;
  /** Delta vs prior period, in percent. Positive = good. */
  deltaPct: number;
  /** Tone for accent + sparkline stroke. */
  tone: KpiTone;
  /** 7-point sparkline series (oldest → newest). */
  sparkline: number[];
  /** Source module id for drilldown. */
  moduleId: string;
  /** Human-readable source label (e.g. "LeadOS", "QuoteFlow"). */
  sourceLabel: string;
  /** Optional sub-source hint (e.g. "12 active leads"). */
  hint?: string;
  /** Optional unit label appended to displayValue when rendered standalone. */
  unit?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module health (for the ecosystem grid)
// ─────────────────────────────────────────────────────────────────────────────

export type ModuleHealth = "healthy" | "warning" | "critical" | "offline";

export interface ModuleHealthEntry {
  moduleId: string;
  nameKey: string;
  health: ModuleHealth;
  /** 0..1 — fraction of healthy sub-signals. */
  score: number;
  /** Short human summary, e.g. "1 SLA breach". */
  summary: string;
  /** Counts feeding the score (e.g. { ok: 11, warn: 1, crit: 0 }). */
  counts: { ok: number; warn: number; crit: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Executive snapshot
// ─────────────────────────────────────────────────────────────────────────────

export interface ExecutiveSnapshot {
  window: WindowRange;
  kpis: KpiCardData[];
  attentionTop: AttentionItem[];
  moduleHealth: ModuleHealthEntry[];
  /** Ecosystem node graph data — modules + connections. */
  ecosystem: {
    nodes: { id: string; label: string; health: ModuleHealth; x: number; y: number }[];
    edges: { from: string; to: string }[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-domain summary shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface SalesSummary {
  window: WindowRange;
  kpis: KpiCardData[];
  /** Pipeline-by-stage breakdown (label → value). */
  byStage: { stage: string; labelKey: string; count: number; value: number; tone: KpiTone }[];
  /** Sales-over-time series (created-in-bucket counts). */
  overTime: { bucket: string; leads: number; won: number; value: number }[];
  /** Top deals at risk (stale + high value). */
  dealsAtRisk: { id: string; name: string; company: string | null; value: number; currency: string; stage: string; staleDays: number; ownerId: string }[];
  /** Owner leaderboard. */
  leaderboard: { ownerId: string; name: string; deals: number; pipeline: number; won: number; wonValue: number }[];
}

export interface QuoteSummary {
  window: WindowRange;
  kpis: KpiCardData[];
  /** Quote funnel: draft → sent → accepted → (rejected/expired). */
  funnel: { stage: string; labelKey: string; count: number; value: number; tone: KpiTone }[];
  /** Quotes expiring soon (≤7d, status=sent). */
  expiringSoon: { id: string; number: string; total: number; currency: string; validUntil: string; daysLeft: number; leadId: string | null }[];
  /** Pending approvals (mocked from automation approval gate). */
  pendingApprovals: { id: string; number: string; total: number; currency: string; createdAt: string }[];
}

export interface DocumentSummary {
  window: WindowRange;
  kpis: KpiCardData[];
  byStatus: { status: string; labelKey: string; count: number; tone: KpiTone }[];
  byClass: { cls: string | null; count: number; avgConfidence: number }[];
  /** Documents currently awaiting review (status=pending|processing|extracted|classified). */
  awaitingReview: { id: string; filename: string; status: string; classification: string | null; createdAt: string }[];
}

export interface AutomationSummary {
  window: WindowRange;
  kpis: KpiCardData[];
  /** Runs over time (created-in-bucket). */
  runsOverTime: { bucket: string; success: number; failed: number }[];
  /** Top failing automations. */
  failing: { id: string; name: string; status: string; failed: number; total: number; lastRunAt: string | null }[];
  /** Pending approvals. */
  pendingApprovals: { id: string; name: string; triggerType: string; lastRunAt: string | null }[];
}

export interface FinanceSummary {
  window: WindowRange;
  kpis: KpiCardData[];
  /** AR aging buckets (current / 1-30 / 31-60 / 60+). */
  arAging: { bucket: string; labelKey: string; count: number; amount: number; tone: KpiTone }[];
  /** Overdue invoices. */
  overdueInvoices: { id: string; number: string; customerId: string; amount: number; currency: string; dueAt: string | null; daysOverdue: number }[];
  /** Low-stock products. */
  lowStock: { id: string; sku: string; name: string; stock: number; unit: string }[];
  /** Revenue by source (paid invoices grouped by customer type). */
  revenueByCustomerType: { type: string; count: number; amount: number }[];
}

export interface IntegrationHealthSummary {
  window: WindowRange;
  kpis: KpiCardData[];
  byStatus: { status: string; labelKey: string; count: number; tone: KpiTone }[];
  /** Degraded / reauth / error integrations. */
  failing: { id: string; provider: string; status: string; lastSyncAt: string | null; eventsProcessed: number }[];
  /** Recent failures (derived from automation failures tagged as integration runs). */
  recentFailures: { id: string; provider: string; message: string; ts: string }[];
}

export interface SlaOperationsSummary {
  window: WindowRange;
  kpis: KpiCardData[];
  /** SLA breaches — leads with slaBreached=true or slaDueAt in past + stage open. */
  slaBreaches: { id: string; leadId: string; leadName: string; company: string | null; ownerId: string; slaDueAt: string | null; hoursOver: number }[];
  /** Stage inactivity — open leads not touched in 3+ days. */
  stageInactivity: { id: string; leadId: string; leadName: string; stage: string; lastActivityAt: string; daysIdle: number }[];
  /** Worker backlog (mocked from automation queue depth). */
  workerBacklog: { workerId: string; name: string; queueDepth: number; status: string }[];
  /** Processing failures (failed automation runs + failed document processing). */
  processingFailures: { id: string; source: string; message: string; ts: string }[];
}
