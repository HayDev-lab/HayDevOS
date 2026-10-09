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

import { t as translateText } from "@/lib/i18n";
import {
mockAutomations,
mockDocuments,
mockIntegrations,
mockInvoices,
mockLeads,
mockProducts,
mockQuotes,
} from "@/lib/mock";
import type {
AiInsight,
AttentionItem,
ControlTranslator,
Priority,
} from "./types";

const getTranslator = (translator?: ControlTranslator): ControlTranslator =>
  translator ?? ((key, params) => translateText(key, "en", params));

// ─────────────────────────────────────────────────────────────────────────────
// Owner / user identity (single source of truth for Control drilldowns)
// ─────────────────────────────────────────────────────────────────────────────

export const OWNER_NAMES: Record<string, string> = {};

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

export const WORKER_SNAPSHOT: WorkerSnapshot[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// Time helpers
// ─────────────────────────────────────────────────────────────────────────────

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

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
export function buildAttentionFeed(translator?: ControlTranslator): AttentionItem[] {
  const tr = getTranslator(translator);
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
        title: tr("control.text.attention.slaTitle", { name: lead.name }),
        body: tr("control.text.attention.slaBody", {
          company: lead.company ?? "—",
          source: lead.source,
          hours: hoursOver,
          owner: ownerName(lead.ownerId),
        }),
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
        title: tr("control.text.attention.automationTitle", { name: a.name, count: a.runs.failed }),
        body: tr("control.text.attention.automationBody", {
          total: a.runs.total.toLocaleString("en-US"),
          success: a.runs.success.toLocaleString("en-US"),
          trigger: a.triggerType,
        }),
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
        title: tr("control.text.attention.integrationTitle", { provider: i.provider }),
        body: tr(
          i.status === "reauth_required"
            ? "control.text.attention.integrationReauthBody"
            : "control.text.attention.integrationErrorBody",
          { count: i.eventsProcessed.toLocaleString("en-US") },
        ),
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
        title: tr("control.text.attention.integrationSlowTitle", { provider: i.provider }),
        body: tr("control.text.attention.integrationSlowBody", {
          count: i.eventsProcessed.toLocaleString("en-US"),
        }),
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
      title: tr("control.text.attention.invoiceTitle", { number: inv.number, days: daysOver }),
      body: tr("control.text.attention.invoiceBody", {
        number: inv.number,
        currency: inv.currency,
        amount: inv.amount.toLocaleString("en-US"),
        days: daysOver,
        customer: inv.customerId,
      }),
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
        title: tr("control.text.attention.staleDealTitle", { company: lead.company ?? lead.name }),
        body: tr("control.text.attention.staleDealBody", {
          currency: lead.currency,
          amount: lead.value.toLocaleString("en-US"),
          stage: lead.stage,
          days: idleDays,
          owner: ownerName(lead.ownerId),
        }),
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
        title: tr("control.text.attention.quoteTitle", { number: q.number, days: daysLeft }),
        body: tr("control.text.attention.quoteBody", {
          number: q.number,
          currency: q.currency,
          amount: q.total.toLocaleString("en-US"),
          lead: q.leadId ?? "—",
        }),
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
      title: tr("control.text.attention.stockTitle", { sku: p.sku, stock: p.stock }),
      body: tr("control.text.attention.stockBody", {
        name: p.name,
        stock: p.stock,
        unit: p.unit,
      }),
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
      title: tr("control.text.attention.documentTitle", { filename: d.filename }),
      body: tr("control.text.attention.documentBody", {
        filename: d.filename,
        classification: d.classification ?? tr("control.text.unclassified"),
        status: d.status,
      }),
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
      title: tr("control.text.attention.workerTitle", { name: w.name, count: w.queueDepth }),
      body: tr("control.text.attention.workerBody", {
        name: w.name,
        region: w.region,
        count: w.queueDepth,
        cpu: w.cpuPct,
        status: w.status,
      }),
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
      title: tr("control.text.attention.approvalTitle", { count: approvalAutomation.runs.failed }),
      body: tr("control.text.attention.approvalBody", {
        name: approvalAutomation.name,
        count: approvalAutomation.runs.failed,
      }),
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
      title: tr("control.text.attention.newLeadTitle", { name: lead.name }),
      body: tr("control.text.attention.newLeadBody", {
        company: lead.company ?? lead.source,
        currency: lead.currency,
        amount: lead.value.toLocaleString("en-US"),
      }),
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
export function buildAiInsights(translator?: ControlTranslator): AiInsight[] {
  const tr = getTranslator(translator);
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
      title: tr("control.text.insight.staleTitle", { count: staleHighValue.length }),
      body: tr("control.text.insight.staleBody", {
        companies: staleHighValue.map((lead) => lead.company ?? lead.name).join(", "),
        amount: staleHighValue.reduce((sum, lead) => sum + lead.value, 0).toLocaleString("en-US"),
      }),
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
      title: tr("control.text.insight.quoteTitle", { number: closest.number, days }),
      body: tr("control.text.insight.quoteBody", {
        number: closest.number,
        currency: closest.currency,
        amount: closest.total.toLocaleString("en-US"),
        lead: closest.leadId ?? tr("control.text.prospect"),
      }),
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
      title: tr("control.text.insight.docsTitle"),
      body: tr("control.text.insight.docsBody", {
        count: docBacklog.length,
        confidence: (docBacklog.reduce((sum, document) => sum + avgConf(document), 0) / docBacklog.length * 100).toFixed(0),
      }),
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
      title: tr("control.text.insight.automationTitle", { name: failingAuto.name, count: failingAuto.runs.failed }),
      body: tr("control.text.insight.automationBody", {
        name: failingAuto.name,
        failed: failingAuto.runs.failed,
        total: failingAuto.runs.total.toLocaleString("en-US"),
        trigger: failingAuto.triggerType,
      }),
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
      title: tr("control.text.insight.integrationTitle", { provider: reauth.provider }),
      body: tr("control.text.insight.integrationBody", {
        provider: reauth.provider,
        count: reauth.eventsProcessed.toLocaleString("en-US"),
      }),
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
      title: tr("control.text.insight.invoiceTitle", {
        count: overdue.length,
        currency: overdue[0].currency,
        amount: total.toLocaleString("en-US"),
      }),
      body: tr("control.text.insight.invoiceBody", {
        invoices: overdue.map((invoice) => invoice.number).join(", "),
        days: Math.round(overdue.length * 2.4),
      }),
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
      title: tr(
        rate >= 50 ? "control.text.insight.acceptanceHealthyTitle" : "control.text.insight.acceptanceLowTitle",
        { rate: rate.toFixed(0) },
      ),
      body: tr(
        rate >= 50 ? "control.text.insight.acceptanceHealthyBody" : "control.text.insight.acceptanceLowBody",
        { accepted, decided },
      ),
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
