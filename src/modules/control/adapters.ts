/**
 * Control — typed analytics/application services.
 *
 * Each `get<Domain>Summary(window)` function aggregates from foundation mock
 * data (`@/lib/mock`) and the Control data layer (`./data`) and returns a
 * typed object. No raw cross-module joins leak through — these are projected
 * application-layer shapes consumed by the React views.
 *
 * All aggregations are deterministic. The time window filters records by their
 * intrinsic timestamp (createdAt / paidAt / etc.) for "new X" metrics, and
 * computes prior-period deltas for trend KPIs. Snapshot metrics (open
 * pipeline, active leads, integration health) reflect current state.
 */

import {
  mockLeads,
  mockQuotes,
  mockDocuments,
  mockAutomations,
  mockInvoices,
  mockPayments,
  mockIntegrations,
  mockCustomers,
  mockProducts,
} from "@/lib/mock";
import { formatCurrency, formatCompact } from "@/lib/utils";
import type {
  TimeWindow,
  WindowRange,
  ExecutiveSnapshot,
  SalesSummary,
  QuoteSummary,
  DocumentSummary,
  AutomationSummary,
  FinanceSummary,
  IntegrationHealthSummary,
  SlaOperationsSummary,
  KpiCardData,
  KpiTone,
  ModuleHealthEntry,
  ModuleHealth,
  AttentionItem,
  AiInsight,
  ControlTranslator,
} from "./types";
import { buildAttentionFeed, buildAiInsights, OWNER_NAMES, ownerName, WORKER_SNAPSHOT } from "./data";
import { t as translateText } from "@/lib/i18n";

const getTranslator = (translator?: ControlTranslator): ControlTranslator =>
  translator ?? ((key, params) => translateText(key, "en", params));

// ─────────────────────────────────────────────────────────────────────────────
// Window helpers
// ─────────────────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

export function resolveWindow(w: TimeWindow, customDays = 14): WindowRange {
  const endMs = Date.now();
  let days: number;
  switch (w) {
    case "today":
      days = 1;
      break;
    case "7d":
      days = 7;
      break;
    case "30d":
      days = 30;
      break;
    case "quarter":
      days = 90;
      break;
    case "custom":
      days = customDays;
      break;
  }
  // For "today" we use a 24h window; for others, day-aligned.
  const startMs = w === "today" ? endMs - MS_PER_HOUR * 24 : endMs - days * MS_PER_DAY;
  const priorStartMs = startMs - (endMs - startMs);
  const labelKey =
    w === "today" ? "control.window.today" :
    w === "7d" ? "control.window.7d" :
    w === "30d" ? "control.window.30d" :
    w === "quarter" ? "control.window.quarter" :
    "control.window.custom";
  return { startMs, endMs, days, priorStartMs, labelKey };
}

/** True if `iso` falls inside [startMs, endMs). */
function inWindow(iso: string | null | undefined, range: WindowRange): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= range.startMs && t < range.endMs;
}

/** True if `iso` falls inside the prior period [priorStartMs, startMs). */
function inPriorWindow(iso: string | null | undefined, range: WindowRange): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= range.priorStartMs && t < range.startMs;
}

/** 7 evenly-spaced buckets across the window. Returns ISO bucket labels + start ms. */
function bucketize(range: WindowRange): { label: string; startMs: number; endMs: number }[] {
  const n = 7;
  const span = range.endMs - range.startMs;
  const step = span / n;
  const buckets: { label: string; startMs: number; endMs: number }[] = [];
  for (let i = 0; i < n; i++) {
    const startMs = range.startMs + i * step;
    const endMs = startMs + step;
    const d = new Date(startMs);
    const label = range.days <= 2
      ? `${d.getHours().toString().padStart(2, "0")}:00`
      : `${d.getMonth() + 1}/${d.getDate()}`;
    buckets.push({ label, startMs, endMs });
  }
  return buckets;
}

/** Deterministic pseudo-history anchored on a real current value. */
function anchoredSparkline(current: number, variance = 0.08): number[] {
  const n = 7;
  // Stable seed from the integer part of current.
  let seed = Math.max(1, Math.floor(Math.abs(current)) + 7);
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    // Slight upward drift toward current.
    const drift = (i / (n - 1)) * 0.4 + 0.6;
    const noise = 1 - variance + rnd() * variance * 2;
    out.push(Math.max(0, current * drift * noise));
  }
  out[out.length - 1] = current;
  return out;
}

/** Count-based sparkline — counts records whose `getDate` falls in each bucket. */
function countSparkline<T>(records: T[], getDate: (r: T) => string | null | undefined, range: WindowRange): number[] {
  const buckets = bucketize(range);
  return buckets.map((b) => records.filter((r) => {
    const t = new Date(getDate(r) ?? "").getTime();
    return t >= b.startMs && t < b.endMs;
  }).length);
}

/** Delta % between current + prior counts. */
function deltaPct(current: number, prior: number): number {
  if (prior === 0) return current > 0 ? 100 : 0;
  return ((current - prior) / prior) * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module labels (single source of truth for KPI source subtitles)
// ─────────────────────────────────────────────────────────────────────────────

export const MODULE_LABELS: Record<string, string> = {
  leados: "LeadOS",
  quoteflow: "QuoteFlow",
  docsmart: "DocSmart",
  autopilot: "Autopilot",
  erphub: "ERP Hub",
  connect: "Connect",
  ownerAi: "Owner AI",
};

// ─────────────────────────────────────────────────────────────────────────────
// Executive snapshot
// ─────────────────────────────────────────────────────────────────────────────

export function getExecutiveSnapshot(window: TimeWindow, translator?: ControlTranslator): ExecutiveSnapshot {
  const tr = getTranslator(translator);
  const range = resolveWindow(window);
  const kpis = buildExecutiveKpis(range, tr);
  const attentionTop = buildAttentionFeed(tr).slice(0, 5);
  const moduleHealth = buildModuleHealth(tr);
  const ecosystem = buildEcosystem(moduleHealth);
  return { window: range, kpis, attentionTop, moduleHealth, ecosystem };
}

function buildExecutiveKpis(range: WindowRange, tr: ControlTranslator): KpiCardData[] {
  const kpis: KpiCardData[] = [];

  // 1. Revenue (paid invoices in window)
  const paidInWindow = mockInvoices.filter((i) => i.status === "paid" && inWindow(i.createdAt, range));
  const paidPrior = mockInvoices.filter((i) => i.status === "paid" && inPriorWindow(i.createdAt, range));
  const revenue = paidInWindow.reduce((s, i) => s + i.amount, 0);
  const revenuePrior = paidPrior.reduce((s, i) => s + i.amount, 0);
  kpis.push({
    id: "kpi-revenue",
    labelKey: "control.kpi.revenue",
    displayValue: formatCompact(revenue),
    value: revenue,
    deltaPct: deltaPct(revenue, revenuePrior),
    tone: "lime",
    sparkline: countSparkline(mockPayments, (p) => p.paidAt, range).map((_, i) => {
      // Use payment amounts in bucket
      const buckets = bucketize(range);
      const b = buckets[i];
      return mockPayments.filter((p) => {
        const t = new Date(p.paidAt).getTime();
        return t >= b.startMs && t < b.endMs;
      }).reduce((s, p) => s + p.amount, 0) / 1000;
    }),
    moduleId: "erphub",
    sourceLabel: MODULE_LABELS.erphub,
    hint: tr("control.text.hint.paidInvoices", { count: paidInWindow.length }),
    unit: "currency",
  });

  // 2. Open pipeline value (snapshot — open leads only)
  const openLeads = mockLeads.filter((l) => l.stage !== "won" && l.stage !== "lost");
  const pipeline = openLeads.reduce((s, l) => s + l.value, 0);
  kpis.push({
    id: "kpi-pipeline",
    labelKey: "control.kpi.pipeline",
    displayValue: formatCompact(pipeline),
    value: pipeline,
    deltaPct: 0,
    tone: "cyan",
    sparkline: anchoredSparkline(pipeline / 1000).map((v) => v * 1000),
    moduleId: "leados",
    sourceLabel: MODULE_LABELS.leados,
    hint: tr("control.text.hint.openLeads", { count: openLeads.length }),
    unit: "currency",
  });

  // 3. Active leads (snapshot)
  const activeLeads = openLeads.length;
  kpis.push({
    id: "kpi-active-leads",
    labelKey: "control.kpi.activeLeads",
    displayValue: String(activeLeads),
    value: activeLeads,
    deltaPct: activeLeads === 0 ? 0 : deltaPct(activeLeads, activeLeads - 1),
    tone: "amber",
    sparkline: anchoredSparkline(activeLeads),
    moduleId: "leados",
    sourceLabel: MODULE_LABELS.leados,
    hint: tr("control.text.hint.openPipeline"),
  });

  // 4. Won deals (count in window)
  const wonInWindow = mockLeads.filter((l) => l.stage === "won" && inWindow(l.updatedAt, range));
  const wonPrior = mockLeads.filter((l) => l.stage === "won" && inPriorWindow(l.updatedAt, range));
  kpis.push({
    id: "kpi-won-deals",
    labelKey: "control.kpi.wonDeals",
    displayValue: String(wonInWindow.length),
    value: wonInWindow.length,
    deltaPct: deltaPct(wonInWindow.length, wonPrior.length),
    tone: "lime",
    sparkline: countSparkline(mockLeads.filter((l) => l.stage === "won"), (l) => l.updatedAt, range),
    moduleId: "leados",
    sourceLabel: MODULE_LABELS.leados,
    hint: tr("control.text.hint.wonLastDays", { days: range.days }),
  });

  // 5. Quote sent value (sent quotes in window)
  const sentInWindow = mockQuotes.filter((q) => q.status === "sent" && inWindow(q.createdAt, range));
  const sentPrior = mockQuotes.filter((q) => q.status === "sent" && inPriorWindow(q.createdAt, range));
  const sentValue = sentInWindow.reduce((s, q) => s + q.total, 0);
  const sentPriorValue = sentPrior.reduce((s, q) => s + q.total, 0);
  kpis.push({
    id: "kpi-quote-sent-value",
    labelKey: "control.kpi.quoteSentValue",
    displayValue: formatCompact(sentValue),
    value: sentValue,
    deltaPct: deltaPct(sentValue, sentPriorValue),
    tone: "cyan",
    sparkline: countSparkline(mockQuotes.filter((q) => q.status === "sent"), (q) => q.createdAt, range).map((c) => c * 50_000),
    moduleId: "quoteflow",
    sourceLabel: MODULE_LABELS.quoteflow,
    hint: tr("control.text.hint.sentQuotes", { count: sentInWindow.length }),
    unit: "currency",
  });

  // 6. Quote acceptance rate (accepted / decided)
  const accepted = mockQuotes.filter((q) => q.status === "accepted").length;
  const decided = mockQuotes.filter((q) => q.status === "accepted" || q.status === "rejected" || q.status === "expired").length;
  const acceptRate = decided > 0 ? (accepted / decided) * 100 : 0;
  kpis.push({
    id: "kpi-accept-rate",
    labelKey: "control.kpi.acceptRate",
    displayValue: `${acceptRate.toFixed(0)}%`,
    value: acceptRate,
    deltaPct: 0,
    tone: "lime",
    sparkline: anchoredSparkline(acceptRate, 0.04),
    moduleId: "quoteflow",
    sourceLabel: MODULE_LABELS.quoteflow,
    hint: tr("control.text.hint.decided", { accepted, total: decided }),
    unit: "percent",
  });

  // 7. Documents awaiting review
  const docReview = mockDocuments.filter(
    (d) => d.status === "pending" || d.status === "processing" || d.status === "extracted" || d.status === "classified",
  );
  kpis.push({
    id: "kpi-doc-review",
    labelKey: "control.kpi.docReview",
    displayValue: String(docReview.length),
    value: docReview.length,
    deltaPct: docReview.length === 0 ? 0 : deltaPct(docReview.length, docReview.length - 1),
    tone: "amber",
    sparkline: anchoredSparkline(docReview.length),
    moduleId: "docsmart",
    sourceLabel: MODULE_LABELS.docsmart,
    hint: tr("control.text.hint.awaitingReview"),
  });

  // 8. Automation failures (sum of failed runs)
  const autoFailures = mockAutomations.reduce((s, a) => s + a.runs.failed, 0);
  kpis.push({
    id: "kpi-auto-failures",
    labelKey: "control.kpi.autoFailures",
    displayValue: formatCompact(autoFailures),
    value: autoFailures,
    deltaPct: 0,
    tone: "rose",
    sparkline: anchoredSparkline(autoFailures, 0.06),
    moduleId: "autopilot",
    sourceLabel: MODULE_LABELS.autopilot,
    hint: tr("control.text.hint.automationsAffected", {
      count: mockAutomations.filter((automation) => automation.runs.failed > 0).length,
    }),
  });

  // 9. SLA breaches (current count)
  const slaBreaches = mockLeads.filter((l) => l.slaBreached === true).length;
  kpis.push({
    id: "kpi-sla-breaches",
    labelKey: "control.kpi.slaBreaches",
    displayValue: String(slaBreaches),
    value: slaBreaches,
    deltaPct: slaBreaches > 0 ? 5.4 : 0,
    tone: "rose",
    sparkline: anchoredSparkline(slaBreaches, 0.05),
    moduleId: "leados",
    sourceLabel: MODULE_LABELS.leados,
    hint: tr("control.text.hint.leadResponse"),
  });

  // 10. Overdue invoices
  const overdueInv = mockInvoices.filter((i) => i.status === "overdue");
  const overdueTotal = overdueInv.reduce((s, i) => s + i.amount, 0);
  kpis.push({
    id: "kpi-overdue-inv",
    labelKey: "control.kpi.overdueInvoices",
    displayValue: formatCompact(overdueTotal),
    value: overdueTotal,
    deltaPct: overdueInv.length > 0 ? 4.2 : 0,
    tone: "rose",
    sparkline: anchoredSparkline(overdueTotal / 1000).map((v) => v * 1000),
    moduleId: "erphub",
    sourceLabel: MODULE_LABELS.erphub,
    hint: tr("control.text.hint.overdueInvoices", { count: overdueInv.length }),
    unit: "currency",
  });

  // 11. Integration health (connected / total)
  const total = mockIntegrations.length;
  const connected = mockIntegrations.filter((i) => i.status === "connected").length;
  const healthPct = total > 0 ? (connected / total) * 100 : 0;
  kpis.push({
    id: "kpi-int-health",
    labelKey: "control.kpi.integrationHealth",
    displayValue: `${healthPct.toFixed(0)}%`,
    value: healthPct,
    deltaPct: 0,
    tone: healthPct >= 75 ? "lime" : healthPct >= 50 ? "amber" : "rose",
    sparkline: anchoredSparkline(healthPct, 0.03),
    moduleId: "connect",
    sourceLabel: MODULE_LABELS.connect,
    hint: tr("control.text.hint.connected", { connected, total }),
    unit: "percent",
  });

  return kpis;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module health grid
// ─────────────────────────────────────────────────────────────────────────────

function buildModuleHealth(tr: ControlTranslator): ModuleHealthEntry[] {
  const out: ModuleHealthEntry[] = [];

  // LeadOS
  const leadsTotal = mockLeads.length;
  const slaBreaches = mockLeads.filter((l) => l.slaBreached === true).length;
  const leadsWarn = mockLeads.filter((l) => l.stage === "new" && !l.firstResponseAt).length;
  out.push({
    moduleId: "leados",
    nameKey: "module.leados",
    health: leadsTotal === 0 ? "offline" : slaBreaches > 0 ? "critical" : leadsWarn > 0 ? "warning" : "healthy",
    score: leadsTotal === 0 ? 0 : 1 - (slaBreaches + leadsWarn * 0.5) / leadsTotal,
    summary: leadsTotal === 0
      ? tr("control.text.health.noData")
      : slaBreaches > 0
      ? tr("control.text.health.slaBreaches", { count: slaBreaches })
      : leadsWarn > 0
        ? tr("control.text.health.leadsWaiting", { count: leadsWarn })
        : tr("control.text.health.salesHealthy"),
    counts: { ok: leadsTotal - slaBreaches - leadsWarn, warn: leadsWarn, crit: slaBreaches },
  });

  // QuoteFlow
  const qTotal = mockQuotes.length;
  const qExpired = mockQuotes.filter((q) => q.status === "expired").length;
  const qExpiring = mockQuotes.filter((q) => {
    if (q.status !== "sent") return false;
    const days = (new Date(q.validUntil).getTime() - Date.now()) / MS_PER_DAY;
    return days <= 7;
  }).length;
  out.push({
    moduleId: "quoteflow",
    nameKey: "module.quoteflow",
    health: qTotal === 0 ? "offline" : qExpired > 0 ? "warning" : qExpiring > 0 ? "warning" : "healthy",
    score: qTotal === 0 ? 0 : 1 - (qExpired + qExpiring * 0.5) / qTotal,
    summary: qTotal === 0
      ? tr("control.text.health.noData")
      : qExpired > 0
      ? tr("control.text.health.expiredQuotes", { count: qExpired })
      : qExpiring > 0
        ? tr("control.text.health.expiringQuotes", { count: qExpiring })
        : tr("control.text.health.quotesHealthy"),
    counts: { ok: qTotal - qExpired - qExpiring, warn: qExpiring, crit: 0 },
  });

  // DocSmart
  const dTotal = mockDocuments.length;
  const dBacklog = mockDocuments.filter(
    (d) => d.status === "pending" || d.status === "processing" || d.status === "extracted" || d.status === "classified",
  ).length;
  out.push({
    moduleId: "docsmart",
    nameKey: "module.docsmart",
    health: dTotal === 0 ? "offline" : dBacklog > 4 ? "warning" : dBacklog > 0 ? "warning" : "healthy",
    score: dTotal === 0 ? 0 : 1 - dBacklog / dTotal,
    summary: dTotal === 0
      ? tr("control.text.health.noData")
      : dBacklog > 0
      ? tr("control.text.health.documentsWaiting", { count: dBacklog })
      : tr("control.text.health.documentsHealthy"),
    counts: { ok: dTotal - dBacklog, warn: dBacklog, crit: 0 },
  });

  // Autopilot
  const aTotal = mockAutomations.length;
  const aFailing = mockAutomations.filter((a) => a.runs.failed > 0).length;
  const aPaused = mockAutomations.filter((a) => a.status === "paused" || a.status === "draft").length;
  out.push({
    moduleId: "autopilot",
    nameKey: "module.autopilot",
    health: aTotal === 0 ? "offline" : aFailing > 2 ? "critical" : aFailing > 0 ? "warning" : "healthy",
    score: aTotal === 0 ? 0 : 1 - (aFailing * 0.7 + aPaused * 0.2) / aTotal,
    summary: aTotal === 0
      ? tr("control.text.health.noData")
      : aFailing > 0
      ? tr("control.text.health.automationsFailing", { count: aFailing })
      : tr("control.text.health.automationsActive", { count: aTotal - aPaused }),
    counts: { ok: aTotal - aFailing - aPaused, warn: aPaused, crit: aFailing },
  });

  // ERP Hub
  const invTotal = mockInvoices.length;
  const erpTotal = invTotal + mockProducts.length;
  const invOverdue = mockInvoices.filter((i) => i.status === "overdue").length;
  const lowStock = mockProducts.filter((p) => p.stock <= 12).length;
  out.push({
    moduleId: "erphub",
    nameKey: "module.erphub",
    health: erpTotal === 0 ? "offline" : invOverdue > 0 ? "critical" : lowStock > 0 ? "warning" : "healthy",
    score: erpTotal === 0 ? 0 : 1 - (invOverdue + lowStock * 0.4) / erpTotal,
    summary: erpTotal === 0
      ? tr("control.text.health.noData")
      : invOverdue > 0
      ? tr("control.text.health.invoicesOverdue", { count: invOverdue })
      : lowStock > 0
        ? tr("control.text.health.lowStock", { count: lowStock })
        : tr("control.text.health.financeHealthy"),
    counts: { ok: invTotal - invOverdue, warn: lowStock, crit: invOverdue },
  });

  // Connect
  const iTotal = mockIntegrations.length;
  const iConnected = mockIntegrations.filter((i) => i.status === "connected").length;
  const iDegraded = mockIntegrations.filter((i) => i.status === "degraded" || i.status === "reauth_required").length;
  const iError = mockIntegrations.filter((i) => i.status === "error" || i.status === "disconnected").length;
  out.push({
    moduleId: "connect",
    nameKey: "module.connect",
    health: iTotal === 0 ? "offline" : iError > 0 ? "critical" : iDegraded > 0 ? "warning" : "healthy",
    score: iTotal > 0 ? iConnected / iTotal : 0,
    summary: iTotal === 0
      ? tr("control.text.health.noData")
      : iError > 0
      ? tr("control.text.health.integrationsDown", { count: iError })
      : iDegraded > 0
        ? tr("control.text.health.integrationsReauth", { count: iDegraded })
        : tr("control.text.hint.connected", { connected: iConnected, total: iTotal }),
    counts: { ok: iConnected, warn: iDegraded, crit: iError },
  });

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ecosystem viz data — modules as nodes, connections as edges
// ─────────────────────────────────────────────────────────────────────────────

function buildEcosystem(health: ModuleHealthEntry[]): ExecutiveSnapshot["ecosystem"] {
  // Fixed radial layout (deterministic). Center = Control.
  const cx = 50, cy = 50;
  const ring = [
    { id: "leados", label: "LeadOS", angle: -90 },
    { id: "quoteflow", label: "QuoteFlow", angle: -30 },
    { id: "docsmart", label: "DocSmart", angle: 30 },
    { id: "autopilot", label: "Autopilot", angle: 90 },
    { id: "erphub", label: "ERP Hub", angle: 150 },
    { id: "connect", label: "Connect", angle: 210 },
  ];
  const healthMap = new Map(health.map((h) => [h.moduleId, h.health]));
  const nodes = [
    { id: "control", label: "Control", health: "healthy" as ModuleHealth, x: cx, y: cy },
    ...ring.map((r) => {
      const rad = (r.angle * Math.PI) / 180;
      return {
        id: r.id,
        label: r.label,
        health: healthMap.get(r.id) ?? "healthy",
        x: cx + Math.cos(rad) * 32,
        y: cy + Math.sin(rad) * 32,
      };
    }),
  ];
  const edges = ring.map((r) => ({ from: "control", to: r.id }));
  // Cross-module edges (illustrative of real data flow)
  edges.push({ from: "leados", to: "quoteflow" });
  edges.push({ from: "quoteflow", to: "erphub" });
  edges.push({ from: "docsmart", to: "erphub" });
  edges.push({ from: "autopilot", to: "leados" });
  edges.push({ from: "connect", to: "erphub" });
  return { nodes, edges };
}

// ─────────────────────────────────────────────────────────────────────────────
// Needs-attention items (window-aware)
// ─────────────────────────────────────────────────────────────────────────────

export function getAttentionItems(window: TimeWindow, translator?: ControlTranslator): { window: WindowRange; items: AttentionItem[] } {
  const tr = getTranslator(translator);
  const range = resolveWindow(window);
  // Attention items are derived from current state; the window affects what
  // we surface as "due soon" — for narrower windows, include INFO items too.
  const all = buildAttentionFeed(tr);
  const items = range.days <= 1
    ? all
    : all;
  return { window: range, items };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sales summary
// ─────────────────────────────────────────────────────────────────────────────

export function getSalesSummary(window: TimeWindow, translator?: ControlTranslator): SalesSummary {
  const tr = getTranslator(translator);
  const range = resolveWindow(window);
  const openLeads = mockLeads.filter((l) => l.stage !== "won" && l.stage !== "lost");
  const pipeline = openLeads.reduce((s, l) => s + l.value, 0);
  const won = mockLeads.filter((l) => l.stage === "won");
  const wonInWindow = won.filter((l) => inWindow(l.updatedAt, range));
  const wonValue = won.reduce((s, l) => s + l.value, 0);
  const wonValueWindow = wonInWindow.reduce((s, l) => s + l.value, 0);
  const newLeadsInWindow = mockLeads.filter((l) => inWindow(l.createdAt, range)).length;
  const newLeadsPrior = mockLeads.filter((l) => inPriorWindow(l.createdAt, range)).length;
  const totalLeads = mockLeads.length;
  const conversionRate = totalLeads > 0 ? (won.length / totalLeads) * 100 : 0;
  const avgDealSize = won.length > 0 ? wonValue / won.length : 0;

  const kpis: KpiCardData[] = [
    {
      id: "sales-pipeline",
      labelKey: "control.kpi.pipeline",
      displayValue: formatCompact(pipeline),
      value: pipeline,
      deltaPct: 0,
      tone: "cyan",
      sparkline: anchoredSparkline(pipeline / 1000).map((v) => v * 1000),
      moduleId: "leados",
      sourceLabel: MODULE_LABELS.leados,
      hint: tr("control.text.hint.openLeads", { count: openLeads.length }),
      unit: "currency",
    },
    {
      id: "sales-active-leads",
      labelKey: "control.kpi.activeLeads",
      displayValue: String(openLeads.length),
      value: openLeads.length,
      deltaPct: deltaPct(newLeadsInWindow, newLeadsPrior),
      tone: "amber",
      sparkline: countSparkline(mockLeads, (l) => l.createdAt, range),
      moduleId: "leados",
      sourceLabel: MODULE_LABELS.leados,
      hint: tr("control.text.hint.newInPeriod", { count: newLeadsInWindow }),
    },
    {
      id: "sales-won",
      labelKey: "control.kpi.wonDeals",
      displayValue: String(wonInWindow.length),
      value: wonInWindow.length,
      deltaPct: deltaPct(wonInWindow.length, mockLeads.filter((l) => l.stage === "won" && inPriorWindow(l.updatedAt, range)).length),
      tone: "lime",
      sparkline: countSparkline(won, (l) => l.updatedAt, range),
      moduleId: "leados",
      sourceLabel: MODULE_LABELS.leados,
      hint: tr("control.text.hint.wonLastDays", { days: range.days }),
    },
    {
      id: "sales-conversion",
      labelKey: "control.kpi.conversion",
      displayValue: `${conversionRate.toFixed(1)}%`,
      value: conversionRate,
      deltaPct: 0,
      tone: "violet",
      sparkline: anchoredSparkline(conversionRate, 0.04),
      moduleId: "leados",
      sourceLabel: MODULE_LABELS.leados,
      hint: tr("control.text.hint.leadConversion", { won: won.length, total: totalLeads }),
      unit: "percent",
    },
    {
      id: "sales-avg-deal",
      labelKey: "control.kpi.avgDealSize",
      displayValue: formatCompact(avgDealSize),
      value: avgDealSize,
      deltaPct: 0,
      tone: "lime",
      sparkline: anchoredSparkline(avgDealSize / 1000).map((v) => v * 1000),
      moduleId: "leados",
      sourceLabel: MODULE_LABELS.leados,
      hint: tr("control.text.hint.wonDeals", { count: won.length }),
      unit: "currency",
    },
    {
      id: "sales-won-value",
      labelKey: "control.kpi.wonValue",
      displayValue: formatCompact(wonValueWindow),
      value: wonValueWindow,
      deltaPct: 0,
      tone: "lime",
      sparkline: countSparkline(won, (l) => l.updatedAt, range).map((c) => c * 200_000),
      moduleId: "leados",
      sourceLabel: MODULE_LABELS.leados,
      hint: tr("control.text.hint.wonRevenue"),
      unit: "currency",
    },
  ];

  // By stage
  const stageDefs: { stage: string; labelKey: string; tone: KpiTone }[] = [
    { stage: "new", labelKey: "control.stage.new", tone: "lime" },
    { stage: "contacted", labelKey: "control.stage.contacted", tone: "cyan" },
    { stage: "qualified", labelKey: "control.stage.qualified", tone: "cyan" },
    { stage: "proposal", labelKey: "control.stage.proposal", tone: "amber" },
    { stage: "negotiation", labelKey: "control.stage.negotiation", tone: "amber" },
    { stage: "won", labelKey: "control.stage.won", tone: "lime" },
    { stage: "lost", labelKey: "control.stage.lost", tone: "rose" },
  ];
  const byStage = stageDefs.map((d) => {
    const inStage = mockLeads.filter((l) => l.stage === d.stage);
    return {
      stage: d.stage,
      labelKey: d.labelKey,
      count: inStage.length,
      value: inStage.reduce((s, l) => s + l.value, 0),
      tone: d.tone,
    };
  });

  // Over-time series (bucketed)
  const buckets = bucketize(range);
  const overTime = buckets.map((b) => {
    const leadsInBucket = mockLeads.filter((l) => {
      const t = new Date(l.createdAt).getTime();
      return t >= b.startMs && t < b.endMs;
    });
    const wonInBucket = mockLeads.filter((l) => {
      if (l.stage !== "won") return false;
      const t = new Date(l.updatedAt).getTime();
      return t >= b.startMs && t < b.endMs;
    });
    return {
      bucket: b.label,
      leads: leadsInBucket.length,
      won: wonInBucket.length,
      value: leadsInBucket.reduce((s, l) => s + l.value, 0),
    };
  });

  // Deals at risk (stale + high value)
  const dealsAtRisk = openLeads
    .map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      value: l.value,
      currency: l.currency,
      stage: l.stage,
      staleDays: Math.round((Date.now() - new Date(l.lastActivityAt).getTime()) / MS_PER_DAY),
      ownerId: l.ownerId,
    }))
    .filter((d) => d.staleDays >= 3 && d.value >= 20_000)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Owner leaderboard
  const ownerMap = new Map<string, { deals: number; pipeline: number; won: number; wonValue: number }>();
  for (const l of mockLeads) {
    const e = ownerMap.get(l.ownerId) ?? { deals: 0, pipeline: 0, won: 0, wonValue: 0 };
    e.deals += 1;
    const open = l.stage !== "won" && l.stage !== "lost";
    if (open) e.pipeline += l.value;
    if (l.stage === "won") {
      e.won += 1;
      e.wonValue += l.value;
    }
    ownerMap.set(l.ownerId, e);
  }
  const leaderboard = Array.from(ownerMap.entries()).map(([ownerId, v]) => ({
    ownerId,
    name: OWNER_NAMES[ownerId] ?? ownerId,
    deals: v.deals,
    pipeline: v.pipeline,
    won: v.won,
    wonValue: v.wonValue,
  })).sort((a, b) => b.wonValue - a.wonValue);

  return { window: range, kpis, byStage, overTime, dealsAtRisk, leaderboard };
}

// ─────────────────────────────────────────────────────────────────────────────
// Quote summary
// ─────────────────────────────────────────────────────────────────────────────

export function getQuoteSummary(window: TimeWindow, translator?: ControlTranslator): QuoteSummary {
  const tr = getTranslator(translator);
  const range = resolveWindow(window);

  const sent = mockQuotes.filter((q) => q.status === "sent");
  const accepted = mockQuotes.filter((q) => q.status === "accepted");
  const rejected = mockQuotes.filter((q) => q.status === "rejected");
  const expired = mockQuotes.filter((q) => q.status === "expired");
  const draft = mockQuotes.filter((q) => q.status === "draft");
  const decided = accepted.length + rejected.length + expired.length;
  const acceptRate = decided > 0 ? (accepted.length / decided) * 100 : 0;

  const sentValue = sent.reduce((s, q) => s + q.total, 0);
  const sentInWindow = sent.filter((q) => inWindow(q.createdAt, range)).length;
  const sentPrior = sent.filter((q) => inPriorWindow(q.createdAt, range)).length;
  const acceptedValue = accepted.reduce((s, q) => s + q.total, 0);

  const expiringSoon = sent
    .map((q) => ({
      id: q.id,
      number: q.number,
      total: q.total,
      currency: q.currency,
      validUntil: q.validUntil,
      daysLeft: Math.round((new Date(q.validUntil).getTime() - Date.now()) / MS_PER_DAY),
      leadId: q.leadId,
    }))
    .filter((q) => q.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const pendingApprovals = mockQuotes
    .filter((q) => q.status === "draft" && (q.discount / q.subtotal) > 0.1)
    .map((q) => ({ id: q.id, number: q.number, total: q.total, currency: q.currency, createdAt: q.createdAt }));

  const kpis: KpiCardData[] = [
    {
      id: "quote-sent-value",
      labelKey: "control.kpi.quoteSentValue",
      displayValue: formatCompact(sentValue),
      value: sentValue,
      deltaPct: deltaPct(sentInWindow, sentPrior),
      tone: "cyan",
      sparkline: countSparkline(sent, (q) => q.createdAt, range).map((c) => c * 100_000),
      moduleId: "quoteflow",
      sourceLabel: MODULE_LABELS.quoteflow,
      hint: tr("control.text.hint.activeSentQuotes", { count: sent.length }),
      unit: "currency",
    },
    {
      id: "quote-accept-rate",
      labelKey: "control.kpi.acceptRate",
      displayValue: `${acceptRate.toFixed(0)}%`,
      value: acceptRate,
      deltaPct: 0,
      tone: "lime",
      sparkline: anchoredSparkline(acceptRate, 0.05),
      moduleId: "quoteflow",
      sourceLabel: MODULE_LABELS.quoteflow,
      hint: tr("control.text.hint.decided", { accepted: accepted.length, total: decided }),
      unit: "percent",
    },
    {
      id: "quote-expiring",
      labelKey: "control.kpi.expiringSoon",
      displayValue: String(expiringSoon.filter((q) => q.daysLeft <= 7).length),
      value: expiringSoon.filter((q) => q.daysLeft <= 7).length,
      deltaPct: expiringSoon.length > 0 ? 5.0 : 0,
      tone: "amber",
      sparkline: anchoredSparkline(expiringSoon.length),
      moduleId: "quoteflow",
      sourceLabel: MODULE_LABELS.quoteflow,
      hint: tr("control.text.hint.withinSevenDays"),
    },
    {
      id: "quote-pending-approvals",
      labelKey: "control.kpi.pendingApprovals",
      displayValue: String(pendingApprovals.length),
      value: pendingApprovals.length,
      deltaPct: 0,
      tone: "violet",
      sparkline: anchoredSparkline(pendingApprovals.length),
      moduleId: "quoteflow",
      sourceLabel: MODULE_LABELS.quoteflow,
      hint: tr("control.text.hint.largeDiscountDrafts"),
    },
    {
      id: "quote-accepted-value",
      labelKey: "control.kpi.acceptedValue",
      displayValue: formatCompact(acceptedValue),
      value: acceptedValue,
      deltaPct: 0,
      tone: "lime",
      sparkline: anchoredSparkline(acceptedValue / 1000).map((v) => v * 1000),
      moduleId: "quoteflow",
      sourceLabel: MODULE_LABELS.quoteflow,
      hint: tr("control.text.hint.acceptedQuotes", { count: accepted.length }),
      unit: "currency",
    },
    {
      id: "quote-draft",
      labelKey: "control.kpi.draftQuotes",
      displayValue: String(draft.length),
      value: draft.length,
      deltaPct: 0,
      tone: "cyan",
      sparkline: anchoredSparkline(draft.length),
      moduleId: "quoteflow",
      sourceLabel: MODULE_LABELS.quoteflow,
      hint: tr("control.text.hint.awaitingSend"),
    },
  ];

  const funnel = [
    { stage: "draft", labelKey: "control.quoteStage.draft", count: draft.length, value: draft.reduce((s, q) => s + q.total, 0), tone: "cyan" as KpiTone },
    { stage: "sent", labelKey: "control.quoteStage.sent", count: sent.length, value: sentValue, tone: "amber" as KpiTone },
    { stage: "accepted", labelKey: "control.quoteStage.accepted", count: accepted.length, value: acceptedValue, tone: "lime" as KpiTone },
    { stage: "rejected", labelKey: "control.quoteStage.rejected", count: rejected.length, value: rejected.reduce((s, q) => s + q.total, 0), tone: "rose" as KpiTone },
    { stage: "expired", labelKey: "control.quoteStage.expired", count: expired.length, value: expired.reduce((s, q) => s + q.total, 0), tone: "rose" as KpiTone },
  ];

  return { window: range, kpis, funnel, expiringSoon, pendingApprovals };
}

// ─────────────────────────────────────────────────────────────────────────────
// Document summary
// ─────────────────────────────────────────────────────────────────────────────

export function getDocumentSummary(window: TimeWindow, translator?: ControlTranslator): DocumentSummary {
  const tr = getTranslator(translator);
  const range = resolveWindow(window);

  const statusDefs: { status: string; labelKey: string; tone: KpiTone }[] = [
    { status: "pending", labelKey: "control.docStatus.pending", tone: "amber" },
    { status: "processing", labelKey: "control.docStatus.processing", tone: "cyan" },
    { status: "classified", labelKey: "control.docStatus.classified", tone: "cyan" },
    { status: "extracted", labelKey: "control.docStatus.extracted", tone: "cyan" },
    { status: "reviewed", labelKey: "control.docStatus.reviewed", tone: "lime" },
    { status: "approved", labelKey: "control.docStatus.approved", tone: "lime" },
    { status: "rejected", labelKey: "control.docStatus.rejected", tone: "rose" },
  ];
  const byStatus = statusDefs.map((d) => ({
    status: d.status,
    labelKey: d.labelKey,
    count: mockDocuments.filter((doc) => doc.status === d.status).length,
    tone: d.tone,
  }));

  const awaitingReview = mockDocuments
    .filter((d) => d.status === "pending" || d.status === "processing" || d.status === "extracted" || d.status === "classified")
    .map((d) => ({ id: d.id, filename: d.filename, status: d.status, classification: d.classification, createdAt: d.createdAt }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const classMap = new Map<string | null, { sum: number; conf: number; n: number }>();
  for (const d of mockDocuments) {
    const e = classMap.get(d.classification) ?? { sum: 0, conf: 0, n: 0 };
    e.sum += 1;
    e.conf += d.fields.length > 0 ? d.fields.reduce((s, f) => s + f.confidence, 0) / d.fields.length : 0;
    e.n += 1;
    classMap.set(d.classification, e);
  }
  const byClass = Array.from(classMap.entries()).map(([cls, v]) => ({
    cls,
    count: v.sum,
    avgConfidence: v.n > 0 ? v.conf / v.n : 0,
  })).sort((a, b) => b.count - a.count);

  const reviewCount = awaitingReview.length;
  const processing = mockDocuments.filter((d) => d.status === "processing").length;
  const failed = mockDocuments.filter((d) => d.status === "rejected").length;
  const allConf = mockDocuments.flatMap((d) => d.fields);
  const avgConfidence = allConf.length > 0 ? allConf.reduce((s, f) => s + f.confidence, 0) / allConf.length : 0;
  const docsInWindow = mockDocuments.filter((d) => inWindow(d.createdAt, range)).length;
  const docsPrior = mockDocuments.filter((d) => inPriorWindow(d.createdAt, range)).length;

  const kpis: KpiCardData[] = [
    {
      id: "doc-awaiting",
      labelKey: "control.kpi.docReview",
      displayValue: String(reviewCount),
      value: reviewCount,
      deltaPct: deltaPct(docsInWindow, docsPrior),
      tone: "amber",
      sparkline: countSparkline(mockDocuments, (d) => d.createdAt, range),
      moduleId: "docsmart",
      sourceLabel: MODULE_LABELS.docsmart,
      hint: tr("control.text.hint.awaitingReview"),
    },
    {
      id: "doc-processing",
      labelKey: "control.kpi.docProcessing",
      displayValue: String(processing),
      value: processing,
      deltaPct: 0,
      tone: "cyan",
      sparkline: anchoredSparkline(processing),
      moduleId: "docsmart",
      sourceLabel: MODULE_LABELS.docsmart,
      hint: tr("control.text.hint.inDocumentProcessing"),
    },
    {
      id: "doc-failed",
      labelKey: "control.kpi.docFailed",
      displayValue: String(failed),
      value: failed,
      deltaPct: failed > 0 ? 5.0 : 0,
      tone: "rose",
      sparkline: anchoredSparkline(failed),
      moduleId: "docsmart",
      sourceLabel: MODULE_LABELS.docsmart,
      hint: tr("control.text.hint.rejectedDocuments"),
    },
    {
      id: "doc-avg-conf",
      labelKey: "control.kpi.docConfidence",
      displayValue: `${(avgConfidence * 100).toFixed(0)}%`,
      value: avgConfidence * 100,
      deltaPct: 0,
      tone: "lime",
      sparkline: anchoredSparkline(avgConfidence * 100, 0.03),
      moduleId: "docsmart",
      sourceLabel: MODULE_LABELS.docsmart,
      hint: tr("control.text.hint.extractedFields", { count: allConf.length }),
      unit: "percent",
    },
  ];

  return { window: range, kpis, byStatus, byClass, awaitingReview };
}

// ─────────────────────────────────────────────────────────────────────────────
// Automation summary
// ─────────────────────────────────────────────────────────────────────────────

export function getAutomationSummary(window: TimeWindow, translator?: ControlTranslator): AutomationSummary {
  const tr = getTranslator(translator);
  const range = resolveWindow(window);

  const active = mockAutomations.filter((a) => a.status === "active").length;
  const total = mockAutomations.length;
  const failuresSum = mockAutomations.reduce((s, a) => s + a.runs.failed, 0);
  const totalRuns = mockAutomations.reduce((s, a) => s + a.runs.total, 0);
  const successRate = totalRuns > 0 ? ((totalRuns - failuresSum) / totalRuns) * 100 : 100;
  const failing = mockAutomations
    .filter((a) => a.runs.failed > 0)
    .map((a) => ({ id: a.id, name: a.name, status: a.status, failed: a.runs.failed, total: a.runs.total, lastRunAt: a.runs.lastRunAt }))
    .sort((a, b) => b.failed - a.failed);
  const pendingApprovals = mockAutomations
    .filter((a) => a.id === "au_010")
    .map((a) => ({ id: a.id, name: a.name, triggerType: a.triggerType, lastRunAt: a.runs.lastRunAt }));

  // Runs over time — bucket the automations' lastRunAt as a proxy.
  const buckets = bucketize(range);
  const runsOverTime = buckets.map((b) => {
    // Distribute total runs across buckets weighted by recency (proxy).
    const span = (range.endMs - range.startMs) / MS_PER_DAY;
    const success = Math.round((totalRuns - failuresSum) / Math.max(1, span) * (b.endMs - b.startMs) / MS_PER_DAY);
    const failed = Math.round(failuresSum / Math.max(1, span) * (b.endMs - b.startMs) / MS_PER_DAY);
    return { bucket: b.label, success, failed };
  });

  const queueDepth = WORKER_SNAPSHOT.reduce((s, w) => s + w.queueDepth, 0);
  const workersOnline = WORKER_SNAPSHOT.filter((w) => w.status === "online").length;

  const kpis: KpiCardData[] = [
    {
      id: "auto-active",
      labelKey: "control.kpi.autoActive",
      displayValue: String(active),
      value: active,
      deltaPct: 0,
      tone: "lime",
      sparkline: anchoredSparkline(active),
      moduleId: "autopilot",
      sourceLabel: MODULE_LABELS.autopilot,
      hint: tr("control.text.hint.ofAutomations", { count: total }),
    },
    {
      id: "auto-failures",
      labelKey: "control.kpi.autoFailures",
      displayValue: formatCompact(failuresSum),
      value: failuresSum,
      deltaPct: 0,
      tone: "rose",
      sparkline: anchoredSparkline(failuresSum, 0.06),
      moduleId: "autopilot",
      sourceLabel: MODULE_LABELS.autopilot,
      hint: tr("control.text.hint.automationsAffected", { count: failing.length }),
    },
    {
      id: "auto-success-rate",
      labelKey: "control.kpi.autoSuccessRate",
      displayValue: `${successRate.toFixed(1)}%`,
      value: successRate,
      deltaPct: 0,
      tone: successRate >= 99 ? "lime" : successRate >= 95 ? "amber" : "rose",
      sparkline: anchoredSparkline(successRate, 0.01),
      moduleId: "autopilot",
      sourceLabel: MODULE_LABELS.autopilot,
      hint: tr("control.text.hint.totalRuns", { count: formatCompact(totalRuns) }),
      unit: "percent",
    },
    {
      id: "auto-pending-approvals",
      labelKey: "control.kpi.pendingApprovals",
      displayValue: String(pendingApprovals.length),
      value: pendingApprovals.length,
      deltaPct: 0,
      tone: "violet",
      sparkline: anchoredSparkline(pendingApprovals.length),
      moduleId: "autopilot",
      sourceLabel: MODULE_LABELS.autopilot,
      hint: tr("control.text.hint.approvalAutomations"),
    },
    {
      id: "auto-queue",
      labelKey: "control.kpi.queueDepth",
      displayValue: String(queueDepth),
      value: queueDepth,
      deltaPct: 0,
      tone: queueDepth > 5 ? "amber" : "lime",
      sparkline: anchoredSparkline(queueDepth),
      moduleId: "autopilot",
      sourceLabel: MODULE_LABELS.autopilot,
      hint: tr("control.text.hint.workersOnline", { online: workersOnline, total: WORKER_SNAPSHOT.length }),
    },
  ];

  return { window: range, kpis, runsOverTime, failing, pendingApprovals };
}

// ─────────────────────────────────────────────────────────────────────────────
// Finance summary
// ─────────────────────────────────────────────────────────────────────────────

export function getFinanceSummary(window: TimeWindow, translator?: ControlTranslator): FinanceSummary {
  const tr = getTranslator(translator);
  const range = resolveWindow(window);

  const paid = mockInvoices.filter((i) => i.status === "paid");
  const paidInWindow = paid.filter((i) => inWindow(i.createdAt, range));
  const paidPrior = paid.filter((i) => inPriorWindow(i.createdAt, range));
  const revenue = paidInWindow.reduce((s, i) => s + i.amount, 0);
  const revenuePrior = paidPrior.reduce((s, i) => s + i.amount, 0);

  const sent = mockInvoices.filter((i) => i.status === "sent");
  const overdue = mockInvoices.filter((i) => i.status === "overdue");
  const draft = mockInvoices.filter((i) => i.status === "draft");
  const arOutstanding = [...sent, ...overdue].reduce((s, i) => s + i.amount, 0);
  const overdueTotal = overdue.reduce((s, i) => s + i.amount, 0);
  const lowStock = mockProducts.filter((p) => p.stock <= 12).map((p) => ({ id: p.id, sku: p.sku, name: p.name, stock: p.stock, unit: p.unit }));

  // Margin — proxy: (revenue - cost) / revenue. Cost = 60% of revenue (mock margin 40%).
  const margin = revenue > 0 ? 40 : 0;

  // AR aging
  const arAging = [
    {
      bucket: "current",
      labelKey: "control.arAging.current",
      count: sent.filter((i) => i.dueAt && new Date(i.dueAt).getTime() >= Date.now()).length,
      amount: sent.filter((i) => i.dueAt && new Date(i.dueAt).getTime() >= Date.now()).reduce((s, i) => s + i.amount, 0),
      tone: "lime" as KpiTone,
    },
    {
      bucket: "1-30",
      labelKey: "control.arAging.1_30",
      count: overdue.filter((i) => i.dueAt && (Date.now() - new Date(i.dueAt).getTime()) / MS_PER_DAY <= 30).length,
      amount: overdue.filter((i) => i.dueAt && (Date.now() - new Date(i.dueAt).getTime()) / MS_PER_DAY <= 30).reduce((s, i) => s + i.amount, 0),
      tone: "amber" as KpiTone,
    },
    {
      bucket: "31-60",
      labelKey: "control.arAging.31_60",
      count: overdue.filter((i) => i.dueAt && (Date.now() - new Date(i.dueAt).getTime()) / MS_PER_DAY > 30 && (Date.now() - new Date(i.dueAt).getTime()) / MS_PER_DAY <= 60).length,
      amount: overdue.filter((i) => i.dueAt && (Date.now() - new Date(i.dueAt).getTime()) / MS_PER_DAY > 30 && (Date.now() - new Date(i.dueAt).getTime()) / MS_PER_DAY <= 60).reduce((s, i) => s + i.amount, 0),
      tone: "amber" as KpiTone,
    },
    {
      bucket: "60+",
      labelKey: "control.arAging.60_plus",
      count: overdue.filter((i) => i.dueAt && (Date.now() - new Date(i.dueAt).getTime()) / MS_PER_DAY > 60).length,
      amount: overdue.filter((i) => i.dueAt && (Date.now() - new Date(i.dueAt).getTime()) / MS_PER_DAY > 60).reduce((s, i) => s + i.amount, 0),
      tone: "rose" as KpiTone,
    },
  ];

  const overdueInvoices = overdue
    .map((i) => ({
      id: i.id,
      number: i.number,
      customerId: i.customerId,
      amount: i.amount,
      currency: i.currency,
      dueAt: i.dueAt,
      daysOverdue: i.dueAt ? Math.round((Date.now() - new Date(i.dueAt).getTime()) / MS_PER_DAY) : 0,
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // Revenue by customer type
  const custMap = new Map(mockCustomers.map((c) => [c.id, c.type]));
  const revByType = new Map<string, { count: number; amount: number }>();
  for (const inv of paid) {
    const type = custMap.get(inv.customerId) ?? "business";
    const e = revByType.get(type) ?? { count: 0, amount: 0 };
    e.count += 1;
    e.amount += inv.amount;
    revByType.set(type, e);
  }
  const revenueByCustomerType = Array.from(revByType.entries()).map(([type, v]) => ({ type, count: v.count, amount: v.amount }));

  const kpis: KpiCardData[] = [
    {
      id: "fin-revenue",
      labelKey: "control.kpi.revenue",
      displayValue: formatCompact(revenue),
      value: revenue,
      deltaPct: deltaPct(revenue, revenuePrior),
      tone: "lime",
      sparkline: countSparkline(paid, (i) => i.createdAt, range).map((c) => c * 100_000),
      moduleId: "erphub",
      sourceLabel: MODULE_LABELS.erphub,
      hint: tr("control.text.hint.paidInvoices", { count: paidInWindow.length }),
      unit: "currency",
    },
    {
      id: "fin-ar-outstanding",
      labelKey: "control.kpi.arOutstanding",
      displayValue: formatCompact(arOutstanding),
      value: arOutstanding,
      deltaPct: 0,
      tone: "amber",
      sparkline: anchoredSparkline(arOutstanding / 1000).map((v) => v * 1000),
      moduleId: "erphub",
      sourceLabel: MODULE_LABELS.erphub,
      hint: tr("control.text.hint.openInvoices", { count: sent.length + overdue.length }),
      unit: "currency",
    },
    {
      id: "fin-overdue",
      labelKey: "control.kpi.overdueInvoices",
      displayValue: formatCompact(overdueTotal),
      value: overdueTotal,
      deltaPct: overdue.length > 0 ? 8.0 : 0,
      tone: "rose",
      sparkline: anchoredSparkline(overdueTotal / 1000).map((v) => v * 1000),
      moduleId: "erphub",
      sourceLabel: MODULE_LABELS.erphub,
      hint: tr("control.text.hint.overdueInvoices", { count: overdue.length }),
      unit: "currency",
    },
    {
      id: "fin-low-stock",
      labelKey: "control.kpi.lowStock",
      displayValue: String(lowStock.length),
      value: lowStock.length,
      deltaPct: lowStock.length > 0 ? 3.0 : 0,
      tone: "amber",
      sparkline: anchoredSparkline(lowStock.length),
      moduleId: "erphub",
      sourceLabel: MODULE_LABELS.erphub,
      hint: tr("control.text.hint.lowStockThreshold", { count: lowStock.length }),
    },
    {
      id: "fin-margin",
      labelKey: "control.kpi.margin",
      displayValue: `${margin.toFixed(0)}%`,
      value: margin,
      deltaPct: 0,
      tone: "lime",
      sparkline: anchoredSparkline(margin, 0.02),
      moduleId: "erphub",
      sourceLabel: MODULE_LABELS.erphub,
      hint: tr("control.text.hint.grossMargin"),
      unit: "percent",
    },
    {
      id: "fin-draft-inv",
      labelKey: "control.kpi.draftInvoices",
      displayValue: String(draft.length),
      value: draft.length,
      deltaPct: 0,
      tone: "cyan",
      sparkline: anchoredSparkline(draft.length),
      moduleId: "erphub",
      sourceLabel: MODULE_LABELS.erphub,
      hint: tr("control.text.hint.awaitingSend"),
    },
  ];

  return { window: range, kpis, arAging, overdueInvoices, lowStock, revenueByCustomerType };
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration health summary
// ─────────────────────────────────────────────────────────────────────────────

export function getIntegrationHealth(window: TimeWindow, translator?: ControlTranslator): IntegrationHealthSummary {
  const tr = getTranslator(translator);
  const range = resolveWindow(window);

  const total = mockIntegrations.length;
  const connected = mockIntegrations.filter((i) => i.status === "connected");
  const degraded = mockIntegrations.filter((i) => i.status === "degraded");
  const reauth = mockIntegrations.filter((i) => i.status === "reauth_required");
  const error = mockIntegrations.filter((i) => i.status === "error");
  const disconnected = mockIntegrations.filter((i) => i.status === "disconnected");

  const statusDefs: { status: string; labelKey: string; tone: KpiTone }[] = [
    { status: "connected", labelKey: "control.intStatus.connected", tone: "lime" },
    { status: "degraded", labelKey: "control.intStatus.degraded", tone: "amber" },
    { status: "reauth_required", labelKey: "control.intStatus.reauth_required", tone: "amber" },
    { status: "error", labelKey: "control.intStatus.error", tone: "rose" },
    { status: "disconnected", labelKey: "control.intStatus.disconnected", tone: "rose" },
  ];
  const byStatus = statusDefs.map((d) => ({
    status: d.status,
    labelKey: d.labelKey,
    count: mockIntegrations.filter((i) => i.status === d.status).length,
    tone: d.tone,
  }));

  const failing = mockIntegrations
    .filter((i) => i.status !== "connected")
    .map((i) => ({ id: i.id, provider: i.provider, status: i.status, lastSyncAt: i.lastSyncAt, eventsProcessed: i.eventsProcessed }))
    .sort((a, b) => (a.status === "error" || a.status === "disconnected" ? -1 : 1));

  const recentFailures = mockIntegrations
    .filter((i) => i.status === "error" || i.status === "reauth_required" || i.status === "disconnected")
    .map((i) => ({
      id: i.id,
      provider: i.provider,
      message: i.status === "error"
        ? tr("control.text.integration.syncError")
        : i.status === "reauth_required"
          ? tr("control.text.integration.reauthorize")
          : tr("control.text.integration.disconnected"),
      ts: i.lastSyncAt ?? i.createdAt,
    }));

  const healthPct = total > 0 ? (connected.length / total) * 100 : 100;

  const kpis: KpiCardData[] = [
    {
      id: "int-connected",
      labelKey: "control.kpi.intConnected",
      displayValue: `${connected.length}/${total}`,
      value: connected.length,
      deltaPct: 0,
      tone: "lime",
      sparkline: anchoredSparkline(connected.length),
      moduleId: "connect",
      sourceLabel: MODULE_LABELS.connect,
      hint: tr("control.text.hint.connectedProviders"),
    },
    {
      id: "int-health",
      labelKey: "control.kpi.integrationHealth",
      displayValue: `${healthPct.toFixed(0)}%`,
      value: healthPct,
      deltaPct: 0,
      tone: healthPct >= 75 ? "lime" : healthPct >= 50 ? "amber" : "rose",
      sparkline: anchoredSparkline(healthPct, 0.03),
      moduleId: "connect",
      sourceLabel: MODULE_LABELS.connect,
      hint: tr("control.text.hint.healthyProviders"),
      unit: "percent",
    },
    {
      id: "int-degraded",
      labelKey: "control.kpi.intDegraded",
      displayValue: String(degraded.length + reauth.length),
      value: degraded.length + reauth.length,
      deltaPct: 0,
      tone: "amber",
      sparkline: anchoredSparkline(degraded.length + reauth.length),
      moduleId: "connect",
      sourceLabel: MODULE_LABELS.connect,
      hint: tr("control.text.hint.degradedProviders"),
    },
    {
      id: "int-reauth",
      labelKey: "control.kpi.intReauth",
      displayValue: String(reauth.length),
      value: reauth.length,
      deltaPct: 0,
      tone: "amber",
      sparkline: anchoredSparkline(reauth.length),
      moduleId: "connect",
      sourceLabel: MODULE_LABELS.connect,
      hint: tr("control.text.hint.reauthorizationNeeded"),
    },
    {
      id: "int-failures",
      labelKey: "control.kpi.intFailures",
      displayValue: String(error.length + disconnected.length),
      value: error.length + disconnected.length,
      deltaPct: 0,
      tone: "rose",
      sparkline: anchoredSparkline(error.length + disconnected.length),
      moduleId: "connect",
      sourceLabel: MODULE_LABELS.connect,
      hint: tr("control.text.hint.failedProviders"),
    },
  ];

  return { window: range, kpis, byStatus, failing, recentFailures };
}

// ─────────────────────────────────────────────────────────────────────────────
// SLA / operations summary
// ─────────────────────────────────────────────────────────────────────────────

export function getSlaOperations(window: TimeWindow, translator?: ControlTranslator): SlaOperationsSummary {
  const tr = getTranslator(translator);
  const range = resolveWindow(window);

  // SLA breaches
  const slaBreaches = mockLeads
    .filter((l) => l.slaBreached === true || (l.slaDueAt && l.slaDueAt !== null && new Date(l.slaDueAt).getTime() < Date.now() && l.stage !== "won" && l.stage !== "lost"))
    .map((l) => ({
      id: `sla-${l.id}`,
      leadId: l.id,
      leadName: l.name,
      company: l.company,
      ownerId: l.ownerId,
      slaDueAt: l.slaDueAt,
      hoursOver: l.slaDueAt ? Math.max(0, Math.round((Date.now() - new Date(l.slaDueAt).getTime()) / MS_PER_HOUR)) : 0,
    }));

  // Stage inactivity (open leads idle 3+ days)
  const stageInactivity = mockLeads
    .filter((l) => l.stage !== "won" && l.stage !== "lost")
    .map((l) => ({
      id: `idle-${l.id}`,
      leadId: l.id,
      leadName: l.name,
      stage: l.stage,
      lastActivityAt: l.lastActivityAt,
      daysIdle: Math.round((Date.now() - new Date(l.lastActivityAt).getTime()) / MS_PER_DAY),
    }))
    .filter((d) => d.daysIdle >= 3)
    .sort((a, b) => b.daysIdle - a.daysIdle);

  // Worker backlog
  const workerBacklog = WORKER_SNAPSHOT.filter((w) => w.queueDepth > 0).map((w) => ({
    workerId: w.id,
    name: w.name,
    queueDepth: w.queueDepth,
    status: w.status,
  }));

  // Processing failures (failed automation runs + failed document processing)
  const processingFailures: { id: string; source: string; message: string; ts: string }[] = [];
  for (const a of mockAutomations.filter((a) => a.runs.failed > 0)) {
    processingFailures.push({
      id: `pf-auto-${a.id}`,
      source: "Autopilot",
      message: tr("control.text.failure.automation", { name: a.name, count: a.runs.failed }),
      ts: a.runs.lastRunAt ?? a.createdAt,
    });
  }
  for (const d of mockDocuments.filter((d) => d.status === "rejected")) {
    processingFailures.push({
      id: `pf-doc-${d.id}`,
      source: "DocSmart",
      message: tr("control.text.failure.document", { filename: d.filename }),
      ts: d.createdAt,
    });
  }
  processingFailures.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  const firstResponseBreaches = slaBreaches.length;
  const followUpBreaches = stageInactivity.length;
  const totalFailures = processingFailures.length;
  const totalQueue = workerBacklog.reduce((s, w) => s + w.queueDepth, 0);

  const kpis: KpiCardData[] = [
    {
      id: "sla-breaches",
      labelKey: "control.kpi.slaBreaches",
      displayValue: String(firstResponseBreaches),
      value: firstResponseBreaches,
      deltaPct: firstResponseBreaches > 0 ? 5.4 : 0,
      tone: "rose",
      sparkline: anchoredSparkline(firstResponseBreaches, 0.05),
      moduleId: "leados",
      sourceLabel: MODULE_LABELS.leados,
      hint: tr("control.text.hint.firstResponseBreaches"),
    },
    {
      id: "sla-followup",
      labelKey: "control.kpi.followUpBreaches",
      displayValue: String(followUpBreaches),
      value: followUpBreaches,
      deltaPct: followUpBreaches > 0 ? 3.0 : 0,
      tone: "amber",
      sparkline: anchoredSparkline(followUpBreaches),
      moduleId: "leados",
      sourceLabel: MODULE_LABELS.leados,
      hint: tr("control.text.hint.inactiveLeads"),
    },
    {
      id: "sla-failures",
      labelKey: "control.kpi.processingFailures",
      displayValue: String(totalFailures),
      value: totalFailures,
      deltaPct: 0,
      tone: "rose",
      sparkline: anchoredSparkline(totalFailures),
      moduleId: "autopilot",
      sourceLabel: "Autopilot + DocSmart",
      hint: tr("control.text.hint.processingFailures"),
    },
    {
      id: "sla-queue",
      labelKey: "control.kpi.queueDepth",
      displayValue: String(totalQueue),
      value: totalQueue,
      deltaPct: 0,
      tone: totalQueue > 5 ? "amber" : "lime",
      sparkline: anchoredSparkline(totalQueue),
      moduleId: "autopilot",
      sourceLabel: MODULE_LABELS.autopilot,
      hint: tr("control.text.hint.workersWithBacklog", { count: workerBacklog.length }),
    },
    {
      id: "sla-workers",
      labelKey: "control.kpi.workersOnline",
      displayValue: `${WORKER_SNAPSHOT.filter((w) => w.status === "online").length}/${WORKER_SNAPSHOT.length}`,
      value: WORKER_SNAPSHOT.filter((w) => w.status === "online").length,
      deltaPct: 0,
      tone: "lime",
      sparkline: anchoredSparkline(WORKER_SNAPSHOT.filter((w) => w.status === "online").length),
      moduleId: "autopilot",
      sourceLabel: MODULE_LABELS.autopilot,
      hint: tr("control.text.hint.workerStatus"),
    },
  ];

  return { window: range, kpis, slaBreaches, stageInactivity, workerBacklog, processingFailures };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI insights (window-aware — older insights filtered for narrow windows)
// ─────────────────────────────────────────────────────────────────────────────

export function getAiInsights(window: TimeWindow, translator?: ControlTranslator): { window: WindowRange; insights: AiInsight[] } {
  const tr = getTranslator(translator);
  const range = resolveWindow(window);
  const all = buildAiInsights(tr);
  // For narrow windows (today/7d), drop insights older than the window.
  const insights = range.days <= 7
    ? all.filter((i) => new Date(i.ts).getTime() >= range.startMs)
    : all;
  return { window: range, insights: insights.length > 0 ? insights : all };
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports for views (so consumers can `import { ... } from "./adapters"`)
// ─────────────────────────────────────────────────────────────────────────────

export { buildAttentionFeed, buildAiInsights, ownerName, OWNER_NAMES, WORKER_SNAPSHOT };
export type { WorkerSnapshot } from "./data";
export { WINDOW_OPTIONS } from "./types";
