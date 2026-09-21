/**
 * HayDevOS — Global Activity Timeline feed (Task 13c).
 *
 * A unified, time-ordered activity feed aggregating events from every module's
 * mock data: leads created/stage-changed/SLA-breach, quotes sent/accepted/
 * expiring, documents uploaded/approved/failed, automations ran/succeeded/
 * failed, invoices issued/paid/overdue, payments received, integrations
 * connected/failed/reauth, audit runs completed, task overdue + Owner AI
 * proposals.
 *
 * Each event carries:
 *   - id: stable unique id
 *   - ts: ISO timestamp (string) — sorted descending in the UI. The event ts
 *     is the underlying entity's real timestamp (e.g. lead.createdAt,
 *     automation.runs.lastRunAt, payment.paidAt). Events whose ts falls
 *     outside the configured 7-day window are filtered out by
 *     `buildActivityFeed({ days: 7 })`, so the timeline always shows what
 *     actually happened in the last week.
 *   - module: registry module id ("leados", "quoteflow", …)
 *   - type: domain event type (e.g. "lead.created", "invoice.paid")
 *   - titleKey: i18n key resolved by the sheet UI ("activity.event.lead.created")
 *   - titleParams: interpolation params for that key
 *   - actor: { name, color } — the user or "System" that performed the event
 *   - severity: info | success | warning | critical
 *   - entityId: stable id for the underlying entity (for CSV / drilldown)
 *   - entityLabel: human label (English fallback) shown in tooltips/CSV
 *   - deepLink: { moduleId, context? } — module to switch to when the user
 *      drills down (context may carry an entity id for the module to resolve)
 *
 * `buildActivityFeed(filter)` returns the filtered + sorted feed.
 * `getActivityStats()` returns counts by module/severity/day plus today +
 *   critical totals + modules-touched count — used by the sheet's stats strip.
 *
 * NO indigo / blue — severity colours map to cyan / lime / amber / rose.
 */

export type ActivitySeverity = "info" | "success" | "warning" | "critical";

export interface ActivityActor {
  name: string;
  /** Tailwind accent token used for the avatar chip. */
  color: "lime" | "cyan" | "amber" | "rose" | "violet";
  /** Pre-computed initials ("Aram H" → "AH") for the avatar chip. */
  initials: string;
}

export interface ActivityDeepLink {
  moduleId: string;
  /** Optional entity context (e.g. "ld_005"). Modules can use this to scroll/highlight. */
  context?: string;
}

export interface ActivityEvent {
  id: string;
  ts: string;
  module: string;
  type: string;
  titleKey: string;
  titleParams?: Record<string, string | number>;
  actor: ActivityActor;
  severity: ActivitySeverity;
  entityId: string;
  entityLabel: string;
  deepLink: ActivityDeepLink;
}

// ─────────────────────────────────────────────────────────────────────────────
// Time helpers (kept local to keep this module self-contained). The "now"
// value is captured once at module load so the relative ordering stays stable
// across re-renders within a session — the timeline always shows events
// "spread across the last 7 days" relative to that anchor.
// ─────────────────────────────────────────────────────────────────────────────

const NOW = Date.now();
const MS_DAY = 86_400_000;
const MS_HOUR = 3_600_000;
const MS_MIN = 60_000;
const WINDOW_DAYS = 7;
const WINDOW_MS = WINDOW_DAYS * MS_DAY;

const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const daysAgoMs = (d: number) => d * MS_DAY;
const hoursAgoMs = (h: number) => h * MS_HOUR;
const minsAgoMs = (m: number) => m * MS_MIN;

// ─────────────────────────────────────────────────────────────────────────────
// Actors
// ─────────────────────────────────────────────────────────────────────────────

function makeActor(name: string, color: ActivityActor["color"]): ActivityActor {
  const parts = name.split(" ").filter(Boolean).slice(0, 2);
  const init = parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  return { name, color, initials: init };
}

const ACTOR_OWNER = makeActor("Aram Hayrapetyan", "lime");
const ACTOR_REP1 = makeActor("Rep 1", "cyan");
const ACTOR_REP2 = makeActor("Rep 2", "amber");
const ACTOR_SYSTEM = makeActor("System", "violet");

// ─────────────────────────────────────────────────────────────────────────────
// Derived helpers — produce an ActivityEvent from a mock record. We do NOT
// mutate the original mock objects; we read stable fields from them.
// ─────────────────────────────────────────────────────────────────────────────

interface CurrencyFmt {
  amount: number;
  currency: string;
}

function money(v: CurrencyFmt): string {
  const symbols: Record<string, string> = { USD: "$", EUR: "€", RUB: "₽", AMD: "֏", GBP: "£", JPY: "¥" };
  const sym = symbols[v.currency] ?? "";
  const num = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: v.amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(v.amount);
  return `${sym}${num}`;
}

function stageLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity builders per module — each pulls real ids from the mock data so
// the timeline stays consistent with what the user sees in each module.
// ─────────────────────────────────────────────────────────────────────────────

import { mockLeads } from "./leads";
import { mockQuotes } from "./quotes";
import { mockDocuments } from "./documents";
import { mockAutomations } from "./automations";
import { mockInvoices, mockPayments } from "./invoices";
import { mockIntegrations } from "./integrations";

function actorForOwnerId(ownerId: string): ActivityActor {
  if (ownerId === "usr_owner") return ACTOR_OWNER;
  if (ownerId === "usr_rep1") return ACTOR_REP1;
  if (ownerId === "usr_rep2") return ACTOR_REP2;
  return ACTOR_SYSTEM;
}

function buildLeadEvents(): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (const l of mockLeads) {
    // created — uses the lead's real createdAt.
    out.push({
      id: `act_lead_created_${l.id}`,
      ts: l.createdAt,
      module: "leados",
      type: "lead.created",
      titleKey: "activity.event.lead.created",
      titleParams: { name: l.name },
      actor: actorForOwnerId(l.ownerId),
      severity: "info",
      entityId: l.id,
      entityLabel: l.name,
      deepLink: { moduleId: "leados", context: l.id },
    });

    // stage changed — fired on the lead's lastActivityAt.
    if (l.stage !== "new") {
      out.push({
        id: `act_lead_stage_${l.id}`,
        ts: l.lastActivityAt,
        module: "leados",
        type: "lead.stage_changed",
        titleKey: "activity.event.lead.stage_changed",
        titleParams: { name: l.name, stage: stageLabel(l.stage) },
        actor: actorForOwnerId(l.ownerId),
        severity: l.stage === "won" ? "success" : l.stage === "lost" ? "warning" : "info",
        entityId: l.id,
        entityLabel: `${l.name} · ${stageLabel(l.stage)}`,
        deepLink: { moduleId: "leados", context: l.id },
      });
    }

    // sla breach
    if (l.slaBreached) {
      out.push({
        id: `act_lead_sla_${l.id}`,
        ts: l.slaDueAt ?? l.lastActivityAt,
        module: "leados",
        type: "lead.sla_breach",
        titleKey: "activity.event.lead.sla_breach",
        titleParams: { name: l.name },
        actor: ACTOR_SYSTEM,
        severity: "critical",
        entityId: l.id,
        entityLabel: l.name,
        deepLink: { moduleId: "leados", context: l.id },
      });
    }
  }
  return out;
}

function buildQuoteEvents(): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (const q of mockQuotes) {
    const total = money({ amount: q.total, currency: q.currency });
    // The "sent/accepted/expiring" event ts is the quote's real createdAt
    // (sent) or a synthetic recent ts (accepted — no separate field on the
    // mock quote).
    if (q.status === "sent") {
      // expiring soon? if validUntil is within 3 days from now, flag it.
      const validMs = new Date(q.validUntil).getTime();
      const daysToExpiry = (validMs - NOW) / MS_DAY;
      if (daysToExpiry >= 0 && daysToExpiry <= 3) {
        out.push({
          id: `act_quote_expiring_${q.id}`,
          ts: iso(hoursAgoMs(2)),
          module: "quoteflow",
          type: "quote.expiring",
          titleKey: "activity.event.quote.expiring",
          titleParams: { number: q.number, total },
          actor: ACTOR_REP1,
          severity: "warning",
          entityId: q.id,
          entityLabel: q.number,
          deepLink: { moduleId: "quoteflow", context: q.id },
        });
      }
      out.push({
        id: `act_quote_sent_${q.id}`,
        ts: q.createdAt,
        module: "quoteflow",
        type: "quote.sent",
        titleKey: "activity.event.quote.sent",
        titleParams: { number: q.number, total },
        actor: ACTOR_REP1,
        severity: "info",
        entityId: q.id,
        entityLabel: q.number,
        deepLink: { moduleId: "quoteflow", context: q.id },
      });
    } else if (q.status === "accepted") {
      // The accepted event ts is taken to be ~1d after the quote was created
      // (synthetic — the mock data only stores `createdAt`).
      const acceptedTs = new Date(
        new Date(q.createdAt).getTime() + MS_DAY,
      ).toISOString();
      out.push({
        id: `act_quote_accepted_${q.id}`,
        ts: acceptedTs,
        module: "quoteflow",
        type: "quote.accepted",
        titleKey: "activity.event.quote.accepted",
        titleParams: { number: q.number, total },
        actor: ACTOR_OWNER,
        severity: "success",
        entityId: q.id,
        entityLabel: q.number,
        deepLink: { moduleId: "quoteflow", context: q.id },
      });
    }
    // draft / rejected / expired — skip; they don't surface as timeline events
    // (or surface as different types in downstream tasks).
  }
  return out;
}

function buildDocumentEvents(): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (const d of mockDocuments) {
    out.push({
      id: `act_doc_uploaded_${d.id}`,
      ts: d.createdAt,
      module: "docsmart",
      type: "doc.uploaded",
      titleKey: "activity.event.doc.uploaded",
      titleParams: { filename: d.filename },
      actor: actorForOwnerId(d.uploadedById),
      severity: "info",
      entityId: d.id,
      entityLabel: d.filename,
      deepLink: { moduleId: "docsmart", context: d.id },
    });
    if (d.status === "approved") {
      // Approved ~1h after upload (synthetic offset).
      const approvedTs = new Date(
        new Date(d.createdAt).getTime() + MS_HOUR,
      ).toISOString();
      out.push({
        id: `act_doc_approved_${d.id}`,
        ts: approvedTs,
        module: "docsmart",
        type: "doc.approved",
        titleKey: "activity.event.doc.approved",
        titleParams: { filename: d.filename },
        actor: ACTOR_OWNER,
        severity: "success",
        entityId: d.id,
        entityLabel: d.filename,
        deepLink: { moduleId: "docsmart", context: d.id },
      });
    } else if (d.status === "rejected") {
      // Failed ~30min after upload (synthetic offset).
      const failedTs = new Date(
        new Date(d.createdAt).getTime() + 30 * MS_MIN,
      ).toISOString();
      out.push({
        id: `act_doc_failed_${d.id}`,
        ts: failedTs,
        module: "docsmart",
        type: "doc.failed",
        titleKey: "activity.event.doc.failed",
        titleParams: { filename: d.filename },
        actor: ACTOR_SYSTEM,
        severity: "warning",
        entityId: d.id,
        entityLabel: d.filename,
        deepLink: { moduleId: "docsmart", context: d.id },
      });
    }
  }
  return out;
}

function buildAutomationEvents(): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (const a of mockAutomations) {
    // Skip automations that have never run (drafts with 0 executions) — they
    // don't surface as activity yet.
    if (a.runs.total === 0) continue;
    // The most recent run (or created-at as fallback).
    const lastRunTs = a.runs.lastRunAt ?? a.createdAt;
    // Each automation emits a single run event — failed runs surface as
    // critical, succeeded runs as success.
    const hasFailures = a.runs.failed > 0;
    out.push({
      id: `act_auto_run_${a.id}`,
      ts: lastRunTs,
      module: "autopilot",
      type: hasFailures ? "automation.failed" : "automation.succeeded",
      titleKey: hasFailures
        ? "activity.event.automation.failed"
        : "activity.event.automation.succeeded",
      titleParams: { name: a.name },
      actor: ACTOR_SYSTEM,
      severity: hasFailures ? "critical" : "success",
      entityId: a.id,
      entityLabel: a.name,
      deepLink: { moduleId: "autopilot", context: a.id },
    });
  }
  return out;
}

function buildInvoiceEvents(): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (const inv of mockInvoices) {
    const total = money({ amount: inv.amount, currency: inv.currency });
    out.push({
      id: `act_invoice_issued_${inv.id}`,
      ts: inv.createdAt,
      module: "erphub",
      type: "invoice.issued",
      titleKey: "activity.event.invoice.issued",
      titleParams: { number: inv.number, total },
      actor: ACTOR_OWNER,
      severity: "info",
      entityId: inv.id,
      entityLabel: inv.number,
      deepLink: { moduleId: "erphub", context: inv.id },
    });
    if (inv.status === "paid") {
      // The paid event ts comes from the matching payment if available,
      // otherwise we use the dueAt.
      const matchingPayment = mockPayments.find((p) => p.invoiceId === inv.id);
      const paidTs = matchingPayment
        ? matchingPayment.paidAt
        : inv.dueAt ?? inv.createdAt;
      out.push({
        id: `act_invoice_paid_${inv.id}`,
        ts: paidTs,
        module: "erphub",
        type: "invoice.paid",
        titleKey: "activity.event.invoice.paid",
        titleParams: { number: inv.number, total },
        actor: ACTOR_SYSTEM,
        severity: "success",
        entityId: inv.id,
        entityLabel: inv.number,
        deepLink: { moduleId: "erphub", context: inv.id },
      });
    } else if (inv.status === "overdue") {
      out.push({
        id: `act_invoice_overdue_${inv.id}`,
        ts: inv.dueAt ?? inv.createdAt,
        module: "erphub",
        type: "invoice.overdue",
        titleKey: "activity.event.invoice.overdue",
        titleParams: { number: inv.number, total },
        actor: ACTOR_SYSTEM,
        severity: "critical",
        entityId: inv.id,
        entityLabel: inv.number,
        deepLink: { moduleId: "erphub", context: inv.id },
      });
    }
  }
  return out;
}

function buildPaymentEvents(): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (const p of mockPayments) {
    const amount = money({ amount: p.amount, currency: p.currency });
    out.push({
      id: `act_payment_${p.id}`,
      ts: p.paidAt,
      module: "erphub",
      type: "payment.received",
      titleKey: "activity.event.payment.received",
      titleParams: { amount },
      actor: ACTOR_SYSTEM,
      severity: "success",
      entityId: p.id,
      entityLabel: `${p.method.toUpperCase()} · ${amount}`,
      deepLink: { moduleId: "erphub", context: p.invoiceId },
    });
  }
  return out;
}

function buildIntegrationEvents(): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (const ig of mockIntegrations) {
    out.push({
      id: `act_integration_connected_${ig.id}`,
      ts: ig.createdAt,
      module: "connect",
      type: "integration.connected",
      titleKey: "activity.event.integration.connected",
      titleParams: { provider: ig.provider },
      actor: ACTOR_OWNER,
      severity: ig.status === "connected" ? "success" : "info",
      entityId: ig.id,
      entityLabel: ig.provider,
      deepLink: { moduleId: "connect", context: ig.id },
    });
    if (ig.status === "reauth_required") {
      out.push({
        id: `act_integration_reauth_${ig.id}`,
        ts: ig.lastSyncAt ?? ig.createdAt,
        module: "connect",
        type: "integration.reauth",
        titleKey: "activity.event.integration.reauth",
        titleParams: { provider: ig.provider },
        actor: ACTOR_SYSTEM,
        severity: "warning",
        entityId: ig.id,
        entityLabel: ig.provider,
        deepLink: { moduleId: "connect", context: ig.id },
      });
    } else if (ig.status === "error" || ig.status === "disconnected") {
      out.push({
        id: `act_integration_failed_${ig.id}`,
        ts: ig.lastSyncAt ?? ig.createdAt,
        module: "connect",
        type: "integration.failed",
        titleKey: "activity.event.integration.failed",
        titleParams: { provider: ig.provider },
        actor: ACTOR_SYSTEM,
        severity: "critical",
        entityId: ig.id,
        entityLabel: ig.provider,
        deepLink: { moduleId: "connect", context: ig.id },
      });
    }
  }
  return out;
}

function buildAuditEvents(): ActivityEvent[] {
  // Two audit-run events anchored to recent timestamps. The Business Audit
  // module's mock questionnaire stays untouched — these events are purely for
  // the timeline surface.
  return [
    {
      id: "act_audit_completed_1",
      ts: iso(daysAgoMs(2)),
      module: "audit",
      type: "audit.completed",
      titleKey: "activity.event.audit.completed",
      titleParams: { score: "B+" },
      actor: ACTOR_OWNER,
      severity: "success",
      entityId: "audit_run_1",
      entityLabel: "Readiness audit · B+",
      deepLink: { moduleId: "audit" },
    },
    {
      id: "act_audit_completed_2",
      ts: iso(daysAgoMs(5)),
      module: "audit",
      type: "audit.completed",
      titleKey: "activity.event.audit.completed",
      titleParams: { score: "A" },
      actor: ACTOR_OWNER,
      severity: "success",
      entityId: "audit_run_2",
      entityLabel: "Readiness audit · A",
      deepLink: { moduleId: "audit" },
    },
  ];
}

function buildTaskEvents(): ActivityEvent[] {
  // Synthetic overdue-task events. These aren't tied to a Tasks module yet
  // (Tasks ship in a later milestone), so we use the "control" module as the
  // drilldown target — Control surfaces operational KPIs that include SLA /
  // overdue counts.
  return [
    {
      id: "act_task_overdue_1",
      ts: iso(hoursAgoMs(3)),
      module: "control",
      type: "task.overdue",
      titleKey: "activity.event.task.overdue",
      titleParams: { name: "Send Q3 onboarding pack" },
      actor: ACTOR_SYSTEM,
      severity: "warning",
      entityId: "task_overdue_1",
      entityLabel: "Send Q3 onboarding pack",
      deepLink: { moduleId: "control" },
    },
    {
      id: "act_task_overdue_2",
      ts: iso(hoursAgoMs(28)),
      module: "control",
      type: "task.overdue",
      titleKey: "activity.event.task.overdue",
      titleParams: { name: "Reconcile Stripe payouts" },
      actor: ACTOR_SYSTEM,
      severity: "critical",
      entityId: "task_overdue_2",
      entityLabel: "Reconcile Stripe payouts",
      deepLink: { moduleId: "control" },
    },
  ];
}

function buildOwnerAiEvents(): ActivityEvent[] {
  // Owner AI proposals — synthetic, anchored to recent timestamps. These
  // surface on the timeline as info events so the user sees when their AI
  // co-founder has surfaced a recommendation.
  return [
    {
      id: "act_ai_proposed_1",
      ts: iso(minsAgoMs(45)),
      module: "ownerAi",
      type: "ai.proposed",
      titleKey: "activity.event.ai.proposed",
      titleParams: { action: "follow up ld_005 (SLA breached)" },
      actor: ACTOR_OWNER,
      severity: "info",
      entityId: "ownerai_prop_1",
      entityLabel: "Owner AI · follow-up proposal",
      deepLink: { moduleId: "ownerAi" },
    },
    {
      id: "act_ai_proposed_2",
      ts: iso(hoursAgoMs(5)),
      module: "ownerAi",
      type: "ai.proposed",
      titleKey: "activity.event.ai.proposed",
      titleParams: { action: "discount on Q-2026-0142" },
      actor: ACTOR_OWNER,
      severity: "info",
      entityId: "ownerai_prop_2",
      entityLabel: "Owner AI · discount proposal",
      deepLink: { moduleId: "ownerAi" },
    },
    {
      id: "act_ai_proposed_3",
      ts: iso(daysAgoMs(1)),
      module: "ownerAi",
      type: "ai.proposed",
      titleKey: "activity.event.ai.proposed",
      titleParams: { action: "renewal reminder to cu_001" },
      actor: ACTOR_OWNER,
      severity: "info",
      entityId: "ownerai_prop_3",
      entityLabel: "Owner AI · renewal reminder",
      deepLink: { moduleId: "ownerAi" },
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate — produce the full feed, then expose a filter function.
// ─────────────────────────────────────────────────────────────────────────────

function buildAllEvents(): ActivityEvent[] {
  return [
    ...buildLeadEvents(),
    ...buildQuoteEvents(),
    ...buildDocumentEvents(),
    ...buildAutomationEvents(),
    ...buildInvoiceEvents(),
    ...buildPaymentEvents(),
    ...buildIntegrationEvents(),
    ...buildAuditEvents(),
    ...buildTaskEvents(),
    ...buildOwnerAiEvents(),
  ];
}

// Module-level cached feed — recomputed on first call only. Mock data is
// stable across the session.
let _cached: ActivityEvent[] | null = null;

/** Get the full activity feed, sorted most-recent-first. */
export function getActivityFeed(): ActivityEvent[] {
  if (_cached) return _cached;
  const all = buildAllEvents();
  all.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  _cached = all;
  return all;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter API
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivityFilter {
  /** Module id ("leados", "quoteflow", …) — undefined means "all modules". */
  module?: string;
  /** Severity filter — undefined means "all severities". */
  severity?: ActivitySeverity;
  /** Time window in days — default 7. */
  days?: number;
  /** Free-text search across title params, actor name, entity label. */
  query?: string;
}

/** Match a single event against the filter, applied to the *English* label
 *  text. The timeline UI re-resolves the titleKey against the live locale so
 *  the actual rendered text is localized; the search matches on the stable
 *  English fallback fields so results are deterministic across locales. */
function matchesFilter(ev: ActivityEvent, filter: ActivityFilter): boolean {
  if (filter.module && ev.module !== filter.module) return false;
  if (filter.severity && ev.severity !== filter.severity) return false;
  const days = filter.days ?? WINDOW_DAYS;
  const cutoff = NOW - days * MS_DAY;
  const tsMs = new Date(ev.ts).getTime();
  if (tsMs < cutoff) return false;
  const q = filter.query?.trim().toLowerCase();
  if (q) {
    const hay = [
      ev.entityLabel,
      ev.actor.name,
      ev.module,
      ev.type,
      ev.entityId,
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/** Build (filter) the activity feed. Always returns a fresh array (sorted
 *  most-recent-first) — safe to memoize on the caller side keyed by the
 *  filter object's stable fields. */
export function buildActivityFeed(filter: ActivityFilter = {}): ActivityEvent[] {
  const all = getActivityFeed();
  return all.filter((ev) => matchesFilter(ev, filter));
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats — counts by module, severity, and day, plus today/critical/modulesTouched
// totals. Used by the sheet's compact stats strip above the timeline.
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivityStats {
  total: number;
  critical: number;
  today: number;
  modulesTouched: number;
  byModule: Record<string, number>;
  bySeverity: Record<ActivitySeverity, number>;
  /** Per-day counts keyed by YYYY-MM-DD (local). Index 0 is today. */
  byDay: { date: string; count: number }[];
}

/** Compute stats from the full feed (filtered to the 7-day window). */
export function getActivityStats(): ActivityStats {
  const all = getActivityFeed();
  const cutoff = NOW - WINDOW_MS;
  const inWindow = all.filter((ev) => {
    const t = new Date(ev.ts).getTime();
    return !isNaN(t) && t >= cutoff;
  });

  const byModule: Record<string, number> = {};
  const bySeverity: Record<ActivitySeverity, number> = {
    info: 0,
    success: 0,
    warning: 0,
    critical: 0,
  };
  const dayCounts = new Map<string, number>();

  // Today & yesterday key helpers (local-time).
  const todayDate = new Date();
  const todayKey = todayDate.toDateString();

  let today = 0;
  let critical = 0;

  for (const ev of inWindow) {
    byModule[ev.module] = (byModule[ev.module] ?? 0) + 1;
    bySeverity[ev.severity] += 1;
    if (ev.severity === "critical") critical += 1;
    const d = new Date(ev.ts);
    if (!isNaN(d.getTime())) {
      const key = d.toDateString();
      if (key === todayKey) today += 1;
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
  }

  // Build per-day series (oldest → newest) for a 7-day sparkline.
  const byDay: { date: string; count: number }[] = [];
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(NOW - i * MS_DAY);
    byDay.push({ date: d.toDateString(), count: dayCounts.get(d.toDateString()) ?? 0 });
  }

  return {
    total: inWindow.length,
    critical,
    today,
    modulesTouched: Object.keys(byModule).length,
    byModule,
    bySeverity,
    byDay,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Day grouping helpers — used by the sheet UI.
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivityDayGroup {
  /** toDateString() of the day. */
  key: string;
  /** Pre-localized display label ("Today" | "Yesterday" | null for raw date format). */
  labelKey: "activity.day.today" | "activity.day.yesterday" | null;
  events: ActivityEvent[];
}

/** Group events into day buckets (most recent first), preserving per-event
 *  ordering inside each bucket. */
export function groupByDay(events: ActivityEvent[]): ActivityDayGroup[] {
  const buckets = new Map<string, ActivityEvent[]>();
  const today = new Date();
  const todayKey = today.toDateString();
  const yesterdayKey = new Date(today.getTime() - MS_DAY).toDateString();
  for (const ev of events) {
    const d = new Date(ev.ts);
    const key = d.toDateString();
    const arr = buckets.get(key) ?? [];
    arr.push(ev);
    buckets.set(key, arr);
  }
  // Preserve the order events were given to us (already sorted desc) when
  // building the bucket list, since Map preserves insertion order.
  const out: ActivityDayGroup[] = [];
  for (const [key, evs] of buckets) {
    let labelKey: ActivityDayGroup["labelKey"] = null;
    if (key === todayKey) labelKey = "activity.day.today";
    else if (key === yesterdayKey) labelKey = "activity.day.yesterday";
    out.push({ key, labelKey, events: evs });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV export — produces a simple CSV string from the (filtered) events.
// ─────────────────────────────────────────────────────────────────────────────

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Export the given events as a CSV string. */
export function exportActivityCsv(events: ActivityEvent[]): string {
  const header = ["id", "timestamp", "module", "type", "severity", "actor", "entityId", "entityLabel", "titleKey"];
  const rows = events.map((ev) =>
    [
      ev.id,
      ev.ts,
      ev.module,
      ev.type,
      ev.severity,
      ev.actor.name,
      ev.entityId,
      ev.entityLabel,
      ev.titleKey,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}
