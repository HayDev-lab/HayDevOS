/**
 * Control — data layer.
 *
 * Two responsibilities:
 *  1. Build the prioritized "Needs Attention" feed (CRITICAL/HIGH/MEDIUM/INFO)
 *     deterministically from foundation mock data (`@/lib/mock`).
 *  2. Provide the AI Insights list (deterministic, mock) plus a few shared
 *     lookups (owner names, worker snapshot, attention-item generators).
 *
 * The heavy aggregation services live in `adapters.ts`. This module is the
 * single source of truth for attention-item + insight text + cross-module
 * identity lookups used by those services and the views.
 */

import {
  mockLeads,
  mockQuotes,
  mockDocuments,
  mockAutomations,
  mockInvoices,
  mockIntegrations,
  mockProducts,
} from "@/lib/mock";
import type {
  AttentionItem,
  AiInsight,
  Priority,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Owner / user identity (single source of truth for Control drilldowns)
// ─────────────────────────────────────────────────────────────────────────────

export const OWNER_NAMES: Record<string, string> = {
  usr_owner: "Aram Hayrapetyan",
  usr_rep1: "Marat Dallakyan",
  usr_rep2: "Lusine Barseghyan",
};

export function ownerName(id: string): string {
  return OWNER_NAMES[id] ?? id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker snapshot — mirrors the Autopilot worker pool (lightweight; we don't
// pull the heavy automation data layer to keep Control self-contained).
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkerSnapshot {
  id: string;
  name: string;
  status: "online" | "draining" | "offline";
  queueDepth: number;
  cpuPct: number;
  region: string;
}

export const WORKER_SNAPSHOT: WorkerSnapshot[] = [
  { id: "wkr-eu-1", name: "wkr-eu-1", status: "online", queueDepth: 2, cpuPct: 41, region: "eu-central" },
  { id: "wkr-eu-2", name: "wkr-eu-2", status: "online", queueDepth: 0, cpuPct: 67, region: "eu-central" },
  { id: "wkr-eu-3", name: "wkr-eu-3", status: "online", queueDepth: 0, cpuPct: 12, region: "eu-central" },
  { id: "wkr-us-1", name: "wkr-us-1", status: "online", queueDepth: 1, cpuPct: 22, region: "us-east" },
  { id: "wkr-us-2", name: "wkr-us-2", status: "draining", queueDepth: 3, cpuPct: 88, region: "us-east" },
  { id: "wkr-us-3", name: "wkr-us-3", status: "offline", queueDepth: 0, cpuPct: 0, region: "us-east" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Time helpers
// ─────────────────────────────────────────────────────────────────────────────

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();
const daysAhead = (d: number) => new Date(now + d * 86_400_000).toISOString();

// ─────────────────────────────────────────────────────────────────────────────
// Attention items feed — derived from foundation mock data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the full prioritized Needs-Attention feed.
 *
 * Items are derived deterministically from mock data:
 *  - SLA-breached leads → CRITICAL
 *  - Failed automation runs → HIGH
 *  - Integration reauth / error → HIGH
 *  - Overdue invoices → HIGH
 *  - Stale high-value deals → HIGH
 *  - Expiring quotes (≤7d) → MEDIUM
 *  - Low-stock products → MEDIUM
 *  - Documents awaiting review → MEDIUM
 *  - Worker backlog (queue depth ≥3) → MEDIUM
 *  - New inbound leads (no response yet) → INFO
 *  - Pending quote approvals (automation gate) → INFO
 *
 * Sorted CRITICAL → HIGH → MEDIUM → INFO, then by timestamp desc within each
 * priority.
 */
export function buildAttentionFeed(): AttentionItem[] {
  const items: AttentionItem[] = [];

  // SLA breaches (mockLeads w/ slaBreached=true OR slaDueAt in past + open stage)
  for (const lead of mockLeads) {
    const open = lead.stage !== "won" && lead.stage !== "lost";
    const breached = lead.slaBreached === true ||
      (open && lead.slaDueAt && new Date(lead.slaDueAt).getTime() < now);
    if (breached) {
      const hoursOver = lead.slaDueAt
        ? Math.max(0, Math.round((now - new Date(lead.slaDueAt).getTime()) / 3_600_000))
        : 0;
      items.push({
        id: `att-sla-${lead.id}`,
        type: "sla_breach",
        priority: "CRITICAL",
        title: `${lead.name} — SLA breach`,
        body: `Lead from ${lead.company ?? "—"} (${lead.source}) breached response SLA${hoursOver > 0 ? ` ${hoursOver}h ago` : ""}. Owner: ${ownerName(lead.ownerId)}.`,
        source: "leados",
        moduleId: "leados",
        entityRef: lead.id,
        ts: lead.slaDueAt ?? lead.updatedAt,
        dueOrAge: "age",
      });
    }
  }

  // Failed automation runs
  for (const a of mockAutomations) {
    if (a.runs.failed > 0) {
      items.push({
        id: `att-auto-${a.id}`,
        type: "automation_failure",
        priority: a.runs.failed >= 50 ? "CRITICAL" : "HIGH",
        title: `${a.name} — ${a.runs.failed} failed run${a.runs.failed === 1 ? "" : "s"}`,
        body: `${a.runs.total.toLocaleString()} total runs · ${a.runs.success.toLocaleString()} succeeded. Last run ${a.runs.lastRunAt ? relFmt(a.runs.lastRunAt) : "—"}. Trigger: ${a.triggerType}.`,
        source: "autopilot",
        moduleId: "autopilot",
        entityRef: a.id,
        ts: a.runs.lastRunAt ?? a.createdAt,
        dueOrAge: "age",
      });
    }
  }

  // Integration reauth / error
  for (const i of mockIntegrations) {
    if (i.status === "reauth_required" || i.status === "error" || i.status === "disconnected") {
      const pri: Priority = i.status === "error" || i.status === "disconnected" ? "HIGH" : "HIGH";
      items.push({
        id: `att-int-${i.id}`,
        type: "integration_reauth",
        priority: pri,
        title: `${i.provider} — ${i.status.replace("_", " ")}`,
        body: `Sync ${i.status === "reauth_required" ? "paused — re-authorization required" : i.status}. ${i.eventsProcessed.toLocaleString()} events processed. Last sync ${i.lastSyncAt ? relFmt(i.lastSyncAt) : "—"}.`,
        source: "connect",
        moduleId: "connect",
        entityRef: i.id,
        ts: i.lastSyncAt ?? i.createdAt,
        dueOrAge: "age",
      });
    }
    if (i.status === "degraded") {
      items.push({
        id: `att-int-deg-${i.id}`,
        type: "integration_reauth",
        priority: "MEDIUM",
        title: `${i.provider} — degraded`,
        body: `Integration sync degraded. ${i.eventsProcessed.toLocaleString()} events processed. Last sync ${i.lastSyncAt ? relFmt(i.lastSyncAt) : "—"}.`,
        source: "connect",
        moduleId: "connect",
        entityRef: i.id,
        ts: i.lastSyncAt ?? i.createdAt,
        dueOrAge: "age",
      });
    }
  }

  // Overdue invoices
  for (const inv of mockInvoices.filter((i) => i.status === "overdue")) {
    const daysOver = inv.dueAt ? Math.max(0, Math.round((now - new Date(inv.dueAt).getTime()) / 86_400_000)) : 0;
    items.push({
      id: `att-inv-${inv.id}`,
      type: "invoice_erp_alert",
      priority: daysOver > 5 ? "CRITICAL" : "HIGH",
      title: `${inv.number} — overdue ${daysOver}d`,
      body: `Invoice ${inv.number} (${inv.currency} ${inv.amount.toLocaleString()}) is ${daysOver} day${daysOver === 1 ? "" : "s"} overdue. Customer ${inv.customerId}.`,
      source: "erphub",
      moduleId: "erphub",
      entityRef: inv.id,
      ts: inv.dueAt ?? inv.createdAt,
      dueOrAge: "age",
    });
  }

  // Stale high-value deals (open, value ≥ 50K, last activity > 7d)
  for (const lead of mockLeads) {
    const open = lead.stage !== "won" && lead.stage !== "lost";
    const idleDays = Math.round((now - new Date(lead.lastActivityAt).getTime()) / 86_400_000);
    if (open && lead.value >= 50_000 && idleDays >= 7) {
      items.push({
        id: `att-stale-${lead.id}`,
        type: "stale_high_value_deal",
        priority: "HIGH",
        title: `${lead.company ?? lead.name} — stale high-value deal`,
        body: `${lead.currency} ${lead.value.toLocaleString()} · stage ${lead.stage} · idle ${idleDays}d. Owner: ${ownerName(lead.ownerId)}.`,
        source: "leados",
        moduleId: "leados",
        entityRef: lead.id,
        ts: lead.lastActivityAt,
        dueOrAge: "age",
      });
    }
  }

  // Expiring quotes (≤7d, status=sent)
  for (const q of mockQuotes.filter((q) => q.status === "sent")) {
    const daysLeft = Math.round((new Date(q.validUntil).getTime() - now) / 86_400_000);
    if (daysLeft <= 7) {
      items.push({
        id: `att-qexp-${q.id}`,
        type: "expiring_quote",
        priority: daysLeft <= 2 ? "HIGH" : "MEDIUM",
        title: `${q.number} — expires in ${daysLeft}d`,
        body: `Sent quote ${q.number} (${q.currency} ${q.total.toLocaleString()}) expires ${relFmt(q.validUntil)}. Lead ${q.leadId ?? "—"}.`,
        source: "quoteflow",
        moduleId: "quoteflow",
        entityRef: q.id,
        ts: q.validUntil,
        dueOrAge: "due",
      });
    }
  }

  // Low-stock products (stock ≤ 12)
  for (const p of mockProducts.filter((p) => p.stock <= 12)) {
    items.push({
      id: `att-stock-${p.id}`,
      type: "invoice_erp_alert",
      priority: "MEDIUM",
      title: `${p.sku} — low stock (${p.stock})`,
      body: `Product "${p.name}" has only ${p.stock} ${p.unit} remaining. Reorder threshold 12.`,
      source: "erphub",
      moduleId: "erphub",
      entityRef: p.id,
      ts: daysAgo(1),
      dueOrAge: "age",
    });
  }

  // Documents awaiting review (pending / processing / extracted / classified)
  for (const d of mockDocuments.filter(
    (d) => d.status === "pending" || d.status === "processing" || d.status === "extracted" || d.status === "classified",
  )) {
    items.push({
      id: `att-doc-${d.id}`,
      type: "document_review",
      priority: d.status === "pending" || d.status === "processing" ? "MEDIUM" : "INFO",
      title: `${d.filename} — ${d.status}`,
      body: `Document ${d.filename} (${d.classification ?? "unclassified"}) is in ${d.status} state. Uploaded ${relFmt(d.createdAt)}.`,
      source: "docsmart",
      moduleId: "docsmart",
      entityRef: d.id,
      ts: d.createdAt,
      dueOrAge: "age",
    });
  }

  // Worker backlog (queue depth ≥ 3)
  for (const w of WORKER_SNAPSHOT.filter((w) => w.queueDepth >= 3)) {
    items.push({
      id: `att-wkr-${w.id}`,
      type: "worker_backlog",
      priority: w.cpuPct > 80 ? "HIGH" : "MEDIUM",
      title: `${w.name} — backlog ${w.queueDepth} jobs`,
      body: `Worker ${w.name} (${w.region}) has ${w.queueDepth} queued jobs · CPU ${w.cpuPct}% · status ${w.status}.`,
      source: "autopilot",
      moduleId: "autopilot",
      entityRef: w.id,
      ts: hoursAgo(0.2),
      dueOrAge: "age",
    });
  }

  // Pending quote approvals (automation gate: discounts > 15%)
  const approvalAutomation = mockAutomations.find((a) => a.id === "au_010");
  if (approvalAutomation && approvalAutomation.runs.failed > 0) {
    items.push({
      id: `att-approve-${approvalAutomation.id}`,
      type: "approval_pending",
      priority: "MEDIUM",
      title: `Approval gate — ${approvalAutomation.runs.failed} pending`,
      body: `${approvalAutomation.name} has ${approvalAutomation.runs.failed} blocked run${approvalAutomation.runs.failed === 1 ? "" : "s"} awaiting owner approval.`,
      source: "autopilot",
      moduleId: "autopilot",
      entityRef: approvalAutomation.id,
      ts: approvalAutomation.runs.lastRunAt ?? approvalAutomation.createdAt,
      dueOrAge: "age",
    });
  }

  // New inbound leads (stage=new, no first response yet)
  for (const lead of mockLeads.filter((l) => l.stage === "new" && !l.firstResponseAt)) {
    items.push({
      id: `att-new-${lead.id}`,
      type: "overdue_followup",
      priority: "INFO",
      title: `${lead.name} — new inbound lead`,
      body: `Lead from ${lead.company ?? lead.source} (${lead.currency} ${lead.value.toLocaleString()}) has no owner response yet. SLA due ${relFmt(lead.slaDueAt ?? lead.createdAt)}.`,
      source: "leados",
      moduleId: "leados",
      entityRef: lead.id,
      ts: lead.createdAt,
      dueOrAge: "due",
    });
  }

  // Sort by priority then timestamp desc
  const priorityRank: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, INFO: 3 };
  return items.sort((a, b) => {
    const pr = priorityRank[a.priority] - priorityRank[b.priority];
    if (pr !== 0) return pr;
    return new Date(b.ts).getTime() - new Date(a.ts).getTime();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AI insights (deterministic, mock)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AI-generated insights. Deterministic — derived from the same mock data the
 * attention feed uses. Each insight has a tone, a drilldown module, and a
 * suggested action with an "Ask Owner AI" affordance.
 */
export function buildAiInsights(): AiInsight[] {
  const insights: AiInsight[] = [];

  // Stale high-value deals
  const staleHighValue = mockLeads.filter((l) => {
    const open = l.stage !== "won" && l.stage !== "lost";
    const idleDays = Math.round((now - new Date(l.lastActivityAt).getTime()) / 86_400_000);
    return open && l.value >= 50_000 && idleDays >= 7;
  });
  if (staleHighValue.length > 0) {
    insights.push({
      id: "ai-stale-deals",
      title: `${staleHighValue.length} deal${staleHighValue.length === 1 ? "" : "s"} at risk`,
      body: `High-value open leads have been idle 7+ days: ${staleHighValue.map((l) => l.company ?? l.name).join(", ")}. Re-engagement likely recovers ${staleHighValue.reduce((s, l) => s + l.value, 0).toLocaleString()} in pipeline.`,
      tone: "amber",
      moduleId: "leados",
      actionKey: "control.insights.action.reengage",
      confidence: 0.86,
      ts: hoursAgo(2),
    });
  }

  // Expiring quotes
  const expiring = mockQuotes.filter((q) => q.status === "sent" && new Date(q.validUntil).getTime() - now <= 7 * 86_400_000);
  const closest = expiring.sort((a, b) => new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime())[0];
  if (closest) {
    const days = Math.max(0, Math.round((new Date(closest.validUntil).getTime() - now) / 86_400_000));
    insights.push({
      id: "ai-quote-expiring",
      title: `Quote ${closest.number} expires in ${days}d`,
      body: `${closest.number} (${closest.currency} ${closest.total.toLocaleString()}) is the closest-to-expiry sent quote. Follow up with ${closest.leadId ?? "the prospect"} to maximize acceptance odds.`,
      tone: "amber",
      moduleId: "quoteflow",
      actionKey: "control.insights.action.followup",
      confidence: 0.92,
      ts: hoursAgo(3),
    });
  }

  // Document review backlog
  const docBacklog = mockDocuments.filter(
    (d) => d.status === "pending" || d.status === "processing" || d.status === "extracted" || d.status === "classified",
  );
  if (docBacklog.length >= 3) {
    insights.push({
      id: "ai-doc-backlog",
      title: `Document review backlog growing`,
      body: `${docBacklog.length} document${docBacklog.length === 1 ? "" : "s"} awaiting review. Average confidence ${(docBacklog.reduce((s, d) => s + avgConf(d), 0) / docBacklog.length * 100).toFixed(0)}% — auto-approve fields above 0.95 to halve review time.`,
      tone: "cyan",
      moduleId: "docsmart",
      actionKey: "control.insights.action.autoApprove",
      confidence: 0.78,
      ts: hoursAgo(5),
    });
  }

  // Automation failures
  const failingAuto = mockAutomations.filter((a) => a.runs.failed > 0).sort((a, b) => b.runs.failed - a.runs.failed)[0];
  if (failingAuto) {
    insights.push({
      id: "ai-auto-failure",
      title: `Automation "${failingAuto.name}" failed ${failingAuto.runs.failed}×`,
      body: `${failingAuto.name} has ${failingAuto.runs.failed} failed run${failingAuto.runs.failed === 1 ? "" : "s"} of ${failingAuto.runs.total.toLocaleString()}. Most failures cluster around ${failingAuto.triggerType} — check the execution log for the root cause.`,
      tone: "rose",
      moduleId: "autopilot",
      actionKey: "control.insights.action.investigate",
      confidence: 0.94,
      ts: hoursAgo(1),
    });
  }

  // Integration reauth
  const reauth = mockIntegrations.find((i) => i.status === "reauth_required" || i.status === "error");
  if (reauth) {
    insights.push({
      id: "ai-int-reauth",
      title: `${reauth.provider} integration needs attention`,
      body: `${reauth.provider} is in ${reauth.status.replace("_", " ")} state. ${reauth.eventsProcessed.toLocaleString()} events processed before disconnect. Re-authorize to resume sync.`,
      tone: "amber",
      moduleId: "connect",
      actionKey: "control.insights.action.reauthorize",
      confidence: 0.99,
      ts: hoursAgo(4),
    });
  }

  // Overdue invoices
  const overdue = mockInvoices.filter((i) => i.status === "overdue");
  if (overdue.length > 0) {
    const total = overdue.reduce((s, i) => s + i.amount, 0);
    insights.push({
      id: "ai-overdue-inv",
      title: `${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"} totaling ${overdue[0].currency} ${total.toLocaleString()}`,
      body: `AR aging: ${overdue.map((i) => i.number).join(", ")}. Send reminders + escalate to finance owner. Estimated days-sales-outstanding impact: +${Math.round(overdue.length * 2.4)}d.`,
      tone: "rose",
      moduleId: "erphub",
      actionKey: "control.insights.action.remind",
      confidence: 0.9,
      ts: hoursAgo(6),
    });
  }

  // Win opportunity — quote acceptance rate
  const accepted = mockQuotes.filter((q) => q.status === "accepted").length;
  const decided = mockQuotes.filter((q) => q.status === "accepted" || q.status === "rejected" || q.status === "expired").length;
  if (decided > 0) {
    const rate = (accepted / decided) * 100;
    insights.push({
      id: "ai-acceptance",
      title: `Quote acceptance rate ${rate.toFixed(0)}% — ${rate >= 50 ? "healthy" : "below target"}`,
      body: `${accepted} accepted of ${decided} decided quotes. ${rate >= 50 ? "Above the 50% benchmark." : "Consider revising pricing or follow-up cadence."} Top accepted product mix suggests bundling DocSmart + Autopilot lifts close rate.`,
      tone: rate >= 50 ? "lime" : "amber",
      moduleId: "quoteflow",
      actionKey: "control.insights.action.optimize",
      confidence: 0.83,
      ts: daysAgo(1),
    });
  }

  return insights;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

function avgConf(d: { fields: { confidence: number }[] }): number {
  if (d.fields.length === 0) return 0;
  return d.fields.reduce((s, f) => s + f.confidence, 0) / d.fields.length;
}

/** Short relative formatter (no locale dependency — Control is locale-aware at the view layer). */
function relFmt(iso: string): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 30 * 86_400_000) return rtf.format(Math.round(diff / 86_400_000), "day");
  return rtf.format(Math.round(diff / (30 * 86_400_000)), "month");
}
