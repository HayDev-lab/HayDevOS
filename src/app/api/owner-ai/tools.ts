/**
 * Owner AI — server-side read tools.
 *
 * Each tool aggregates from the foundation mock data (`@/lib/mock`) — either by
 * delegating to the Control module's typed adapters (`@/modules/control/adapters`)
 * or by computing a derived view on the fly. Tools return JSON-serializable
 * payloads (no Dates, no Maps). They are pure functions and never mutate state.
 *
 * These tools are called by the LLM (via the tool-call loop in `route.ts`) AND
 * by the offline fallback engine (`./offline.ts`). They are the ONLY way the
 * Owner AI accesses module data — no raw SQL, no direct DB, no shell, no FS.
 *
 * Factuality: every number the Owner AI reports MUST originate from one of
 * these tool results. The system prompt forbids inventing numbers.
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
} from "@/lib/mock";
import {
  getExecutiveSnapshot,
  getAttentionItems,
  getSalesSummary,
  getQuoteSummary,
  getDocumentSummary,
  getAutomationSummary,
  getFinanceSummary,
  getIntegrationHealth,
} from "@/modules/control/adapters";
import type { TimeWindow } from "@/modules/control/types";
import { ownerName } from "@/modules/control/data";
import { formatCompact } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Tool dispatch table
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolDef {
  name: string;
  description: string;
  /** Parameter spec — flat { name: type } for the LLM. */
  params: Record<string, string>;
}

export const TOOL_DEFS: ToolDef[] = [
  {
    name: "getExecutiveSnapshot",
    description:
      "Get the executive snapshot: 11 KPIs (revenue, pipeline, active leads, won deals, conversion, SLA health, document backlog, automation success, integration health, AR aging, attention count), top 5 needs-attention items, and module health.",
    params: { window: '"today" | "7d" | "30d" | "quarter" (default "30d")' },
  },
  {
    name: "getAttentionItems",
    description:
      "Get the prioritized needs-attention feed (CRITICAL/HIGH/MEDIUM/INFO) across all modules. Use this for 'what needs attention' questions.",
    params: { window: '"today" | "7d" | "30d" | "quarter" (default "7d")' },
  },
  {
    name: "getSalesSummary",
    description:
      "Get the sales/pipeline summary: KPIs (pipeline, active leads, won, conversion rate, avg deal size, won value), pipeline-by-stage breakdown, deals at risk, owner leaderboard.",
    params: { window: '"today" | "7d" | "30d" | "quarter" (default "30d")' },
  },
  {
    name: "getRiskLeads",
    description:
      "Get leads at risk: SLA-breached leads + stale high-value open leads (idle 7+ days, value ≥ 50K). Use for 'which deals are at risk' questions.",
    params: {},
  },
  {
    name: "getQuoteSummary",
    description:
      "Get the quote summary: KPIs (sent value, accept rate, expiring soon, pending approvals), funnel by stage, expiring quotes, pending approvals.",
    params: { window: '"today" | "7d" | "30d" | "quarter" (default "30d")' },
  },
  {
    name: "getExpiringQuotes",
    description:
      "Get quotes expiring within N days (default 7). Returns quote number, total, currency, daysLeft, leadId. Use for 'which quotes expire' questions.",
    params: { days: "number (default 7)" },
  },
  {
    name: "getDocumentSummary",
    description:
      "Get the document AI summary: KPIs (pending, processing, classified, reviewed, approved, rejected), by-status counts, by-class confidence, awaiting review list.",
    params: { window: '"today" | "7d" | "30d" | "quarter" (default "30d")' },
  },
  {
    name: "findDocuments",
    description: "Search the current organization's persisted document metadata by title, filename, or source id.",
    params: { query: "string (required)" },
  },
  {
    name: "getDocumentMetadata",
    description: "Get tenant-authorized metadata for one persisted document, including immutable version metadata but never storage credentials.",
    params: { documentId: "string (required)" },
  },
  {
    name: "listDocumentVersions",
    description: "List immutable metadata versions for one tenant-authorized document.",
    params: { documentId: "string (required)" },
  },
  {
    name: "getQuoteDocuments",
    description: "List persisted PDF/DOCX/JSON artifacts generated from immutable versions of a quote.",
    params: { quoteId: "string (required)" },
  },
  {
    name: "getAutomationSummary",
    description:
      "Get the automation summary: KPIs (active, paused, success rate, failed runs, pending approvals), runs over time, top failing automations, pending approvals.",
    params: { window: '"today" | "7d" | "30d" | "quarter" (default "30d")' },
  },
  {
    name: "getFailedAutomations",
    description: "Get automations with failed runs sorted by failure count.",
    params: {},
  },
  {
    name: "getFinanceSummary",
    description:
      "Get the ERP/finance summary: KPIs (revenue, AR, overdue count, overdue amount, low stock count), AR aging buckets, overdue invoices, low-stock products, revenue by customer type.",
    params: { window: '"today" | "7d" | "30d" | "quarter" (default "30d")' },
  },
  {
    name: "findOrders",
    description: "Search authoritative tenant orders by order number or customer name, with server-computed payment state.",
    params: { query: "string (optional)", status: "order status (optional)" },
  },
  {
    name: "getOrder",
    description: "Get one tenant-authorized order with immutable item snapshots, revision, fulfillment count, and computed payment state.",
    params: { orderId: "string (required)" },
  },
  {
    name: "getInventory",
    description: "Get authoritative on-hand, reserved, and available inventory balances for the tenant.",
    params: { query: "string (optional)", warehouseId: "string (optional)", availability: '"all" | "available" | "low" | "out"' },
  },
  {
    name: "findProducts",
    description: "Search the canonical tenant product catalog, including stocked/non-stocked/service classification.",
    params: { query: "string (optional)", type: '"STOCKED_PRODUCT" | "NON_STOCKED_PRODUCT" | "SERVICE" (optional)' },
  },
  {
    name: "getCustomerOrders",
    description: "List authoritative orders for one canonical customer.",
    params: { customerId: "string (required)" },
  },
  {
    name: "getPaymentStatus",
    description: "Get an order payment status computed from confirmed append-only payments and refunds without implicit FX conversion.",
    params: { orderId: "string (required)" },
  },
  {
    name: "getErpOverview",
    description: "Get authoritative ERP order, inventory, and confirmed finance event totals grouped by currency.",
    params: {},
  },
  {
    name: "getIntegrationHealth",
    description:
      "Get integration health: KPIs (connected, degraded, reauth, error, total), by-status counts, failing integrations, recent failures.",
    params: { window: '"today" | "7d" | "30d" | "quarter" (default "30d")' },
  },
  {
    name: "searchGlobal",
    description:
      "Search across leads, quotes, documents, customers by free-text query. Returns matched records (max 5 per type) with id, label, type, and a small payload.",
    params: { query: "string (required)" },
  },
  {
    name: "getTimeline",
    description:
      "Get a recent cross-module activity timeline (leads, quotes, documents, automations, invoices, payments, integrations). Max 20 most-recent events.",
    params: { window: '"today" | "7d" | "30d" | "quarter" (default "7d")' },
  },
];

const WINDOW_KEYS = new Set(["today", "7d", "30d", "quarter"]);

function asWindow(value: unknown, fallback: TimeWindow = "30d"): TimeWindow {
  if (typeof value === "string" && WINDOW_KEYS.has(value)) return value as TimeWindow;
  return fallback;
}

function asInt(value: unknown, fallback: number, min = 1, max = 365): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// ─────────────────────────────────────────────────────────────────────────────
// Tools
// ─────────────────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;
const now = () => Date.now();

/** Strip fields the LLM/tool UI doesn't need from control-adapter outputs. */
function kpisToCompact(kpis: { id: string; labelKey: string; displayValue: string; value: number; deltaPct: number; tone: string; sourceLabel: string; hint?: string }[]) {
  return kpis.map((k) => ({
    id: k.id,
    label: k.labelKey,
    value: k.displayValue,
    raw: k.value,
    deltaPct: Math.round(k.deltaPct * 10) / 10,
    tone: k.tone,
    source: k.sourceLabel,
    hint: k.hint ?? null,
  }));
}

function tool_getExecutiveSnapshot(args: Record<string, unknown>) {
  const window = asWindow(args.window, "30d");
  const snap = getExecutiveSnapshot(window);
  return {
    window,
    kpis: kpisToCompact(snap.kpis),
    attentionTop: snap.attentionTop.map((a) => ({
      id: a.id,
      priority: a.priority,
      title: a.title,
      body: a.body,
      source: a.source,
      moduleId: a.moduleId,
      ts: a.ts,
    })),
    moduleHealth: snap.moduleHealth.map((m) => ({
      module: m.moduleId,
      health: m.health,
      score: Math.round(m.score * 100) / 100,
      summary: m.summary,
    })),
  };
}

function tool_getAttentionItems(args: Record<string, unknown>) {
  const window = asWindow(args.window, "7d");
  const res = getAttentionItems(window);
  return {
    window,
    count: res.items.length,
    items: res.items.map((a) => ({
      id: a.id,
      priority: a.priority,
      type: a.type,
      title: a.title,
      body: a.body,
      source: a.source,
      moduleId: a.moduleId,
      ts: a.ts,
      dueOrAge: a.dueOrAge,
    })),
  };
}

function tool_getSalesSummary(args: Record<string, unknown>) {
  const window = asWindow(args.window, "30d");
  const s = getSalesSummary(window);
  return {
    window,
    kpis: kpisToCompact(s.kpis),
    byStage: s.byStage,
    dealsAtRisk: s.dealsAtRisk.map((d) => ({
      id: d.id,
      name: d.name,
      company: d.company,
      value: d.value,
      currency: d.currency,
      stage: d.stage,
      staleDays: d.staleDays,
      owner: ownerName(d.ownerId),
    })),
    leaderboard: s.leaderboard,
  };
}

function tool_getRiskLeads() {
  const t = now();
  const atRisk: Array<{
    id: string;
    name: string;
    company: string | null;
    value: number;
    currency: string;
    stage: string;
    ownerId: string;
    owner: string;
    reason: "sla_breach" | "stale_high_value";
    staleDays: number;
    slaDueAt: string | null;
    hoursOver?: number;
    lastActivityAt: string;
  }> = [];

  for (const lead of mockLeads) {
    const open = lead.stage !== "won" && lead.stage !== "lost";
    if (!open) continue;
    const breached = lead.slaBreached === true ||
      (lead.slaDueAt && new Date(lead.slaDueAt).getTime() < t);
    if (breached) {
      const hoursOver = lead.slaDueAt
        ? Math.max(0, Math.round((t - new Date(lead.slaDueAt).getTime()) / 3_600_000))
        : 0;
      atRisk.push({
        id: lead.id,
        name: lead.name,
        company: lead.company,
        value: lead.value,
        currency: lead.currency,
        stage: lead.stage,
        ownerId: lead.ownerId,
        owner: ownerName(lead.ownerId),
        reason: "sla_breach",
        staleDays: Math.round((t - new Date(lead.lastActivityAt).getTime()) / MS_PER_DAY),
        slaDueAt: lead.slaDueAt,
        hoursOver,
        lastActivityAt: lead.lastActivityAt,
      });
      continue;
    }
    const idleDays = Math.round((t - new Date(lead.lastActivityAt).getTime()) / MS_PER_DAY);
    if (lead.value >= 50_000 && idleDays >= 7) {
      atRisk.push({
        id: lead.id,
        name: lead.name,
        company: lead.company,
        value: lead.value,
        currency: lead.currency,
        stage: lead.stage,
        ownerId: lead.ownerId,
        owner: ownerName(lead.ownerId),
        reason: "stale_high_value",
        staleDays: idleDays,
        slaDueAt: lead.slaDueAt,
        lastActivityAt: lead.lastActivityAt,
      });
    }
  }

  // Sort: SLA breach first, then by value desc.
  atRisk.sort((a, b) => {
    if (a.reason !== b.reason) return a.reason === "sla_breach" ? -1 : 1;
    return b.value - a.value;
  });

  return {
    count: atRisk.length,
    totalValue: atRisk.reduce((s, l) => s + l.value, 0),
    leads: atRisk,
  };
}

function tool_getQuoteSummary(args: Record<string, unknown>) {
  const window = asWindow(args.window, "30d");
  const s = getQuoteSummary(window);
  return {
    window,
    kpis: kpisToCompact(s.kpis),
    funnel: s.funnel,
    expiringSoon: s.expiringSoon,
    pendingApprovals: s.pendingApprovals,
  };
}

function tool_getExpiringQuotes(args: Record<string, unknown>) {
  const days = asInt(args.days, 7, 1, 90);
  const t = now();
  const horizon = t + days * MS_PER_DAY;
  const out = mockQuotes
    .filter((q) => q.status === "sent" || q.status === "draft")
    .map((q) => ({
      id: q.id,
      number: q.number,
      total: q.total,
      currency: q.currency,
      status: q.status,
      validUntil: q.validUntil,
      daysLeft: Math.round((new Date(q.validUntil).getTime() - t) / MS_PER_DAY),
      leadId: q.leadId,
    }))
    .filter((q) => {
      const v = new Date(q.validUntil).getTime();
      return v >= t && v <= horizon;
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
  return {
    days,
    count: out.length,
    quotes: out,
  };
}

function tool_getDocumentSummary(args: Record<string, unknown>) {
  const window = asWindow(args.window, "30d");
  const s = getDocumentSummary(window);
  return {
    window,
    kpis: kpisToCompact(s.kpis),
    byStatus: s.byStatus,
    byClass: s.byClass,
    awaitingReview: s.awaitingReview,
  };
}

function tool_getAutomationSummary(args: Record<string, unknown>) {
  const window = asWindow(args.window, "30d");
  const s = getAutomationSummary(window);
  return {
    window,
    kpis: kpisToCompact(s.kpis),
    runsOverTime: s.runsOverTime,
    failing: s.failing,
    pendingApprovals: s.pendingApprovals,
  };
}

function tool_getFailedAutomations() {
  const t = now();
  const out = mockAutomations
    .filter((a) => a.runs.failed > 0)
    .map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      triggerType: a.triggerType,
      failed: a.runs.failed,
      total: a.runs.total,
      success: a.runs.success,
      successRate: a.runs.total > 0 ? Math.round((a.runs.success / a.runs.total) * 1000) / 10 : 0,
      lastRunAt: a.runs.lastRunAt,
      lastRunAgoHrs: a.runs.lastRunAt
        ? Math.round((t - new Date(a.runs.lastRunAt).getTime()) / 3_600_000)
        : null,
    }))
    .sort((a, b) => b.failed - a.failed);
  return {
    count: out.length,
    totalFailed: out.reduce((s, a) => s + a.failed, 0),
    automations: out,
  };
}

function tool_getFinanceSummary(args: Record<string, unknown>) {
  const window = asWindow(args.window, "30d");
  const s = getFinanceSummary(window);
  return {
    window,
    kpis: kpisToCompact(s.kpis),
    arAging: s.arAging,
    overdueInvoices: s.overdueInvoices,
    lowStock: s.lowStock,
    revenueByCustomerType: s.revenueByCustomerType,
  };
}

function tool_getIntegrationHealth(args: Record<string, unknown>) {
  const window = asWindow(args.window, "30d");
  const s = getIntegrationHealth(window);
  return {
    window,
    kpis: kpisToCompact(s.kpis),
    byStatus: s.byStatus,
    failing: s.failing,
    recentFailures: s.recentFailures,
  };
}

function tool_searchGlobal(args: Record<string, unknown>) {
  const q = String(args.query ?? "").trim().toLowerCase();
  if (!q) return { query: "", results: [], count: 0 };
  const matches = (s: string | null | undefined) => !!s && s.toLowerCase().includes(q);

  const leadHits = mockLeads
    .filter((l) => matches(l.name) || matches(l.email) || matches(l.company))
    .slice(0, 5)
    .map((l) => ({ id: l.id, type: "lead", label: l.name, sub: l.company ?? l.email ?? l.source, stage: l.stage, value: l.value, currency: l.currency }));

  const quoteHits = mockQuotes
    .filter((qq) => matches(qq.number) || matches(qq.customerId) || matches(qq.leadId))
    .slice(0, 5)
    .map((qq) => ({ id: qq.id, type: "quote", label: qq.number, sub: qq.status, total: qq.total, currency: qq.currency }));

  const docHits = mockDocuments
    .filter((d) => matches(d.filename) || matches(d.classification))
    .slice(0, 5)
    .map((d) => ({ id: d.id, type: "document", label: d.filename, sub: d.classification ?? d.status, status: d.status }));

  const custHits = mockCustomers
    .filter((c) => matches(c.name) || matches(c.email) || matches(c.phone))
    .slice(0, 5)
    .map((c) => ({ id: c.id, type: "customer", label: c.name, sub: c.email ?? c.type, type2: c.type, totalSpent: c.totalSpent }));

  const results = [
    ...leadHits,
    ...quoteHits,
    ...docHits,
    ...custHits,
  ];
  return {
    query: q,
    count: results.length,
    results,
    breakdown: {
      leads: leadHits.length,
      quotes: quoteHits.length,
      documents: docHits.length,
      customers: custHits.length,
    },
  };
}

function tool_getTimeline(args: Record<string, unknown>) {
  const window = asWindow(args.window, "7d");
  const days = window === "today" ? 1 : window === "7d" ? 7 : window === "30d" ? 30 : 90;
  const t = now();
  const since = t - days * MS_PER_DAY;
  const within = (iso: string | null | undefined) => {
    if (!iso) return false;
    return new Date(iso).getTime() >= since;
  };

  type Event = { ts: string; module: string; type: string; label: string; sub?: string; id: string };

  const events: Event[] = [];

  for (const l of mockLeads) {
    if (within(l.createdAt)) {
      events.push({ ts: l.createdAt, module: "leados", type: "lead_created", label: l.name, sub: `${l.company ?? l.source} · ${l.currency} ${formatCompact(l.value)}`, id: l.id });
    }
    if (within(l.updatedAt) && (l.stage === "won" || l.stage === "lost")) {
      events.push({ ts: l.updatedAt, module: "leados", type: `lead_${l.stage}`, label: l.name, sub: l.stage === "won" ? "won" : "lost", id: l.id });
    }
  }
  for (const q of mockQuotes) {
    if (within(q.createdAt)) {
      events.push({ ts: q.createdAt, module: "quoteflow", type: "quote_created", label: q.number, sub: `${q.status} · ${q.currency} ${formatCompact(q.total)}`, id: q.id });
    }
  }
  for (const d of mockDocuments) {
    if (within(d.createdAt)) {
      events.push({ ts: d.createdAt, module: "docsmart", type: "document_uploaded", label: d.filename, sub: d.classification ?? d.status, id: d.id });
    }
  }
  for (const a of mockAutomations) {
    if (a.runs.lastRunAt && within(a.runs.lastRunAt)) {
      events.push({ ts: a.runs.lastRunAt, module: "autopilot", type: "automation_run", label: a.name, sub: a.triggerType, id: a.id });
    }
  }
  for (const inv of mockInvoices) {
    if (within(inv.createdAt)) {
      events.push({ ts: inv.createdAt, module: "erphub", type: `invoice_${inv.status}`, label: inv.number, sub: `${inv.currency} ${formatCompact(inv.amount)}`, id: inv.id });
    }
  }
  for (const p of mockPayments) {
    if (within(p.paidAt)) {
      events.push({ ts: p.paidAt, module: "erphub", type: "payment_received", label: `Payment ${p.method}`, sub: `${p.currency} ${formatCompact(p.amount)}`, id: p.id });
    }
  }
  for (const i of mockIntegrations) {
    if (within(i.lastSyncAt)) {
      events.push({ ts: i.lastSyncAt!, module: "connect", type: `integration_${i.status}`, label: i.provider, sub: i.status, id: i.id });
    }
  }

  events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  return {
    window,
    days,
    count: events.length,
    events: events.slice(0, 20),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch
// ─────────────────────────────────────────────────────────────────────────────

const TOOL_FN_TABLE: Record<string, (args: Record<string, unknown>) => unknown> = {
  getExecutiveSnapshot: tool_getExecutiveSnapshot,
  getAttentionItems: tool_getAttentionItems,
  getSalesSummary: tool_getSalesSummary,
  getRiskLeads: tool_getRiskLeads,
  getQuoteSummary: tool_getQuoteSummary,
  getExpiringQuotes: tool_getExpiringQuotes,
  getDocumentSummary: tool_getDocumentSummary,
  findDocuments: () => { throw new Error("Authenticated tenant document service required"); },
  getDocumentMetadata: () => { throw new Error("Authenticated tenant document service required"); },
  listDocumentVersions: () => { throw new Error("Authenticated tenant document service required"); },
  getQuoteDocuments: () => { throw new Error("Authenticated tenant document service required"); },
  getAutomationSummary: tool_getAutomationSummary,
  getFailedAutomations: tool_getFailedAutomations,
  getFinanceSummary: tool_getFinanceSummary,
  findOrders: () => { throw new Error("Authenticated tenant ERP service required"); },
  getOrder: () => { throw new Error("Authenticated tenant ERP service required"); },
  getInventory: () => { throw new Error("Authenticated tenant ERP service required"); },
  findProducts: () => { throw new Error("Authenticated tenant ERP service required"); },
  getCustomerOrders: () => { throw new Error("Authenticated tenant ERP service required"); },
  getPaymentStatus: () => { throw new Error("Authenticated tenant ERP service required"); },
  getErpOverview: () => { throw new Error("Authenticated tenant ERP service required"); },
  getIntegrationHealth: tool_getIntegrationHealth,
  searchGlobal: tool_searchGlobal,
  getTimeline: tool_getTimeline,
};

export const AVAILABLE_TOOL_NAMES = Object.keys(TOOL_FN_TABLE);

/** Dispatch a tool by name. Throws on unknown tool. */
export function dispatchTool(
  name: string,
  args: Record<string, unknown>,
): { result: unknown; durationMs: number } {
  const fn = TOOL_FN_TABLE[name];
  if (!fn) {
    throw new Error(`Unknown tool: ${name}`);
  }
  const t0 = Date.now();
  const result = fn(args ?? {});
  const durationMs = Date.now() - t0;
  return { result, durationMs };
}

/** Build a short summary string for a tool result, for the chat UI card. */
export function summarizeToolResult(name: string, result: unknown): {
  summary: string;
  count?: number;
  preview: string;
} {
  const json = safeStringify(result);
  const preview = json.length > 1800 ? json.slice(0, 1800) + "…(truncated)" : json;
  const r = result as Record<string, unknown> | null;
  const count =
    r && typeof r === "object" && typeof r.count === "number"
      ? (r.count as number)
      : Array.isArray((r as { items?: unknown[] })?.items)
        ? ((r as { items: unknown[] }).items.length)
        : Array.isArray((r as { kpis?: unknown[] })?.kpis)
          ? ((r as { kpis: unknown[] }).kpis.length)
          : undefined;
  let summary = "OK";
  switch (name) {
    case "getExecutiveSnapshot":
      summary = `Returned ${Array.isArray((r as { kpis?: unknown[] })?.kpis) ? (r as { kpis: unknown[] }).kpis.length : "?"} KPIs + ${Array.isArray((r as { attentionTop?: unknown[] })?.attentionTop) ? (r as { attentionTop: unknown[] }).attentionTop.length : 0} attention items`;
      break;
    case "getAttentionItems":
      summary = `Returned ${(r as { count?: number })?.count ?? 0} attention items`;
      break;
    case "getSalesSummary":
      summary = `Returned sales KPIs + ${Array.isArray((r as { dealsAtRisk?: unknown[] })?.dealsAtRisk) ? (r as { dealsAtRisk: unknown[] }).dealsAtRisk.length : 0} deals at risk`;
      break;
    case "getRiskLeads":
      summary = `Returned ${(r as { count?: number })?.count ?? 0} at-risk leads totaling ${formatCompact(((r as { totalValue?: number })?.totalValue) ?? 0)}`;
      break;
    case "getQuoteSummary":
      summary = `Returned quote KPIs + ${Array.isArray((r as { expiringSoon?: unknown[] })?.expiringSoon) ? (r as { expiringSoon: unknown[] }).expiringSoon.length : 0} expiring`;
      break;
    case "getExpiringQuotes":
      summary = `Returned ${(r as { count?: number })?.count ?? 0} expiring quotes within ${(r as { days?: number })?.days ?? "?"}d`;
      break;
    case "getDocumentSummary":
      summary = `Returned document KPIs + ${Array.isArray((r as { awaitingReview?: unknown[] })?.awaitingReview) ? (r as { awaitingReview: unknown[] }).awaitingReview.length : 0} awaiting review`;
      break;
    case "getAutomationSummary":
      summary = `Returned automation KPIs + ${Array.isArray((r as { failing?: unknown[] })?.failing) ? (r as { failing: unknown[] }).failing.length : 0} failing`;
      break;
    case "getFailedAutomations":
      summary = `Returned ${(r as { count?: number })?.count ?? 0} failing automations`;
      break;
    case "getFinanceSummary":
      summary = `Returned finance KPIs + ${Array.isArray((r as { overdueInvoices?: unknown[] })?.overdueInvoices) ? (r as { overdueInvoices: unknown[] }).overdueInvoices.length : 0} overdue invoices`;
      break;
    case "getIntegrationHealth":
      summary = `Returned integration KPIs + ${Array.isArray((r as { failing?: unknown[] })?.failing) ? (r as { failing: unknown[] }).failing.length : 0} failing`;
      break;
    case "searchGlobal":
      summary = `Found ${(r as { count?: number })?.count ?? 0} matches for "${(r as { query?: string })?.query ?? ""}"`;
      break;
    case "getTimeline":
      summary = `Returned ${(r as { count?: number })?.count ?? 0} timeline events (top 20 shown)`;
      break;
    default:
      summary = "OK";
  }
  return { summary, count, preview };
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL_REGISTRY — name → { description, parameters schema, execute fn, requiresApproval }
// ─────────────────────────────────────────────────────────────────────────────
//
// The registry is the single source of truth for the Owner AI tool/action
// surface. It includes:
//   - read tools (kind="read", requiresApproval=false, execute returns data)
//   - safe actions (kind="safe-action", requiresApproval=false, execution is
//     deliberately blocked here and must go through the tenant executor)
//   - risky actions (kind="risky-action", requiresApproval=true, execute does
//     NOT run — it returns a { requiresApproval: true, action, args } marker
//     that the route turns into a pending approval)
//
// The system-prompt builder (./prompt.ts) reads TOOL_DEFS for the read-tool
// documentation; this registry adds the action surface + machine-readable
// parameter schemas for the UI / inspection.

export type ToolKind = "read" | "safe-action" | "risky-action";

export interface ToolParameterSchema {
  type: "string" | "number" | "boolean";
  description?: string;
  required?: boolean;
  enum?: string[];
  default?: string | number;
  minimum?: number;
  maximum?: number;
}

export interface ToolRegistryEntry {
  name: string;
  description: string;
  parameters: Record<string, ToolParameterSchema>;
  requiresApproval: boolean;
  kind: ToolKind;
  /**
   * Execute the tool/action. For read tools: returns the data payload. For
   * safe actions: fails closed so callers use the tenant executor. For
   * risky actions: does NOT execute — returns a marker that the caller must
   * turn into a pending approval.
   */
  execute: (args: Record<string, unknown>) => unknown;
}

const WINDOW_ENUM = ["today", "7d", "30d", "quarter"] as const;

/** Convert a TOOL_DEFS params string-map to a JSON-schema-style object. */
function paramsToSchema(
  params: Record<string, string>,
): Record<string, ToolParameterSchema> {
  const out: Record<string, ToolParameterSchema> = {};
  for (const [key, raw] of Object.entries(params)) {
    if (raw.includes("today") && raw.includes("quarter")) {
      out[key] = {
        type: "string",
        enum: [...WINDOW_ENUM],
        default: raw.match(/default "(\w+)"/)?.[1] ?? "30d",
        description: "Time window for the aggregation",
      };
    } else if (raw.startsWith("number")) {
      out[key] = {
        type: "number",
        default: Number(raw.match(/default (\d+)/)?.[1] ?? 7),
        minimum: 1,
        maximum: 90,
        description: raw,
      };
    } else {
      out[key] = {
        type: "string",
        required: raw.includes("required"),
        description: raw,
      };
    }
  }
  return out;
}

// — Read-tool entries (built from TOOL_DEFS + TOOL_FN_TABLE) —
function buildReadEntries(): ToolRegistryEntry[] {
  return TOOL_DEFS.map((def) => ({
    name: def.name,
    description: def.description,
    parameters: paramsToSchema(def.params),
    requiresApproval: false,
    kind: "read" as const,
    execute: (args: Record<string, unknown>) => {
      const fn = TOOL_FN_TABLE[def.name];
      if (!fn) throw new Error(`Unknown read tool: ${def.name}`);
      return fn(args ?? {});
    },
  }));
}

// Safe-action metadata. Actual execution belongs to action-executor.ts.
function execSafeAction(
  name: string,
  _args: Record<string, unknown>,
): never {
  throw new Error(
    `Action ${name} must be executed through the authenticated tenant action executor`,
  );
}

const SAFE_ACTION_ENTRIES: ToolRegistryEntry[] = [
  {
    name: "createTask",
    description: "Create a tenant-scoped task with title, assignee, and due date.",
    parameters: {
      title: { type: "string", required: true, description: "Task title" },
      assignee: { type: "string", required: true, description: "Assignee id or name" },
      dueAt: { type: "string", description: "ISO date the task is due" },
      entityType: { type: "string", description: "Optional related entity type (lead/quote/document)" },
      entityId: { type: "string", description: "Optional related entity id" },
    },
    requiresApproval: false,
    kind: "safe-action",
    execute: (args) => execSafeAction("createTask", args),
  },
  {
    name: "createInternalNote",
    description: "Add a tenant-scoped internal note to an entity.",
    parameters: {
      entityType: { type: "string", required: true, description: "lead | quote | document | customer" },
      entityId: { type: "string", required: true, description: "Entity id" },
      body: { type: "string", required: true, description: "Note body (max 120 chars)" },
    },
    requiresApproval: false,
    kind: "safe-action",
    execute: (args) => execSafeAction("createInternalNote", args),
  },
  {
    name: "assignTask",
    description: "Reassign an existing tenant task to a member.",
    parameters: {
      taskId: { type: "string", required: true, description: "Task id" },
      assigneeId: { type: "string", required: true, description: "New assignee id" },
    },
    requiresApproval: false,
    kind: "safe-action",
    execute: (args) => execSafeAction("assignTask", args),
  },
  {
    name: "generateReport",
    description: "Persist a tenant report request (daily / weekly / monthly / quarterly).",
    parameters: {
      type: { type: "string", enum: ["daily", "weekly", "monthly", "quarterly"], default: "weekly", description: "Report cadence" },
      window: { type: "string", enum: [...WINDOW_ENUM], default: "7d", description: "Time window covered" },
    },
    requiresApproval: false,
    kind: "safe-action",
    execute: (args) => execSafeAction("generateReport", args),
  },
  {
    name: "generateQuoteDocument",
    description: "Generate a verified PDF or DOCX from a persisted immutable quote version.",
    parameters: {
      quoteId: { type: "string", required: true, description: "Quote id" },
      versionId: { type: "string", description: "Optional immutable quote version id" },
      format: { type: "string", enum: ["pdf", "docx"], default: "pdf", description: "Artifact format" },
      locale: { type: "string", enum: ["hy", "ru", "en"], default: "en", description: "Document language" },
    },
    requiresApproval: false,
    kind: "safe-action",
    execute: (args) => execSafeAction("generateQuoteDocument", args),
  },
  {
    name: "openWorkspaceTab",
    description: "Open one of the allowlisted HayDevOS workspace sections in the current tab.",
    parameters: {
      module: { type: "string", required: true, description: "Known workspace module id" },
      section: { type: "string", description: "Known section within that module" },
    },
    requiresApproval: false,
    kind: "safe-action",
    execute: (args) => execSafeAction("openWorkspaceTab", args),
  },
  {
    name: "openWebSearch",
    description: "Open a bounded external search tab for an explicit user query; this does not claim verified search results.",
    parameters: {
      query: { type: "string", required: true, description: "Search query" },
      provider: { type: "string", enum: ["google", "bing", "duckduckgo"], default: "google", description: "Search host" },
    },
    requiresApproval: false,
    kind: "safe-action",
    execute: (args) => execSafeAction("openWebSearch", args),
  },
  {
    name: "openStudioMagic",
    description: "Open the Magic montage editor with a validated prompt without starting paid generation.",
    parameters: {
      prompt: { type: "string", required: true, description: "Video brief" },
      durationSec: { type: "number", default: 120, description: "Requested duration in seconds" },
      language: { type: "string", default: "Русский", description: "Generation language" },
      aspectRatio: { type: "string", enum: ["16:9", "9:16", "1:1"], default: "16:9", description: "Video aspect ratio" },
    },
    requiresApproval: false,
    kind: "safe-action",
    execute: (args) => execSafeAction("openStudioMagic", args),
  },
];

// — Risky-action entries (return a "needs approval" marker, do NOT execute) —
const RISKY_ACTION_ENTRIES: ToolRegistryEntry[] = [
  {
    name: "runApprovedAutomation",
    description: "Run an automation currently blocked on owner approval. REQUIRES APPROVAL.",
    parameters: { automationId: { type: "string", required: true, description: "Automation id" } },
    requiresApproval: true,
    kind: "risky-action",
    execute: (args) => ({ requiresApproval: true, action: "runApprovedAutomation", args }),
  },
  {
    name: "sendExternalMessage",
    description: "Send an email/Slack/SMS to an external party. REQUIRES APPROVAL.",
    parameters: {
      to: { type: "string", required: true, description: "Recipient" },
      channel: { type: "string", enum: ["email", "slack", "sms"], default: "email", description: "Channel" },
      subject: { type: "string", description: "Subject (email)" },
      body: { type: "string", required: true, description: "Message body" },
    },
    requiresApproval: true,
    kind: "risky-action",
    execute: (args) => ({ requiresApproval: true, action: "sendExternalMessage", args }),
  },
  {
    name: "setLeadStage",
    description: "Change a lead's pipeline stage (e.g. to 'won' or 'lost'). REQUIRES APPROVAL.",
    parameters: {
      leadId: { type: "string", required: true, description: "Lead id" },
      stage: { type: "string", required: true, enum: ["new", "qualified", "proposal", "negotiation", "won", "lost"], description: "Target stage" },
    },
    requiresApproval: true,
    kind: "risky-action",
    execute: (args) => ({ requiresApproval: true, action: "setLeadStage", args }),
  },
  {
    name: "markQuoteWon",
    description: "Mark a quote as accepted/won. REQUIRES APPROVAL.",
    parameters: { quoteId: { type: "string", required: true, description: "Quote id" } },
    requiresApproval: true,
    kind: "risky-action",
    execute: (args) => ({ requiresApproval: true, action: "markQuoteWon", args }),
  },
  {
    name: "markQuoteLost",
    description: "Mark a quote as rejected/lost. REQUIRES APPROVAL.",
    parameters: { quoteId: { type: "string", required: true, description: "Quote id" } },
    requiresApproval: true,
    kind: "risky-action",
    execute: (args) => ({ requiresApproval: true, action: "markQuoteLost", args }),
  },
  {
    name: "archiveRecord",
    description: "Archive a record (lead/quote/document). REQUIRES APPROVAL.",
    parameters: {
      entityType: { type: "string", required: true, description: "lead | quote | document | customer" },
      entityId: { type: "string", required: true, description: "Entity id" },
    },
    requiresApproval: true,
    kind: "risky-action",
    execute: (args) => ({ requiresApproval: true, action: "archiveRecord", args }),
  },
  {
    name: "deleteRecord",
    description: "Soft-delete a record. REQUIRES APPROVAL.",
    parameters: {
      entityType: { type: "string", required: true, description: "lead | quote | document | customer" },
      entityId: { type: "string", required: true, description: "Entity id" },
    },
    requiresApproval: true,
    kind: "risky-action",
    execute: (args) => ({ requiresApproval: true, action: "deleteRecord", args }),
  },
  {
    name: "mutateFinancialRecord",
    description: "Edit an invoice/payment/credit memo. REQUIRES APPROVAL.",
    parameters: {
      recordType: { type: "string", required: true, enum: ["invoice", "payment", "credit_memo"], description: "Record type" },
      recordId: { type: "string", required: true, description: "Record id" },
      mutation: { type: "string", required: true, description: "Mutation description" },
    },
    requiresApproval: true,
    kind: "risky-action",
    execute: (args) => ({ requiresApproval: true, action: "mutateFinancialRecord", args }),
  },
  {
    name: "sendWebhook",
    description: "Fire an outgoing webhook. REQUIRES APPROVAL.",
    parameters: { webhookId: { type: "string", required: true, description: "Webhook endpoint id" } },
    requiresApproval: true,
    kind: "risky-action",
    execute: (args) => ({ requiresApproval: true, action: "sendWebhook", args }),
  },
  {
    name: "changeIntegrationConfig",
    description: "Modify an integration's config or credentials. REQUIRES APPROVAL.",
    parameters: {
      integrationId: { type: "string", required: true, description: "Integration id" },
      changes: { type: "string", required: true, description: "Config changes (JSON)" },
    },
    requiresApproval: true,
    kind: "risky-action",
    execute: (args) => ({ requiresApproval: true, action: "changeIntegrationConfig", args }),
  },
  {
    name: "highImpactAutomation",
    description: "Run a high-impact automation (bulk update, mass send, destructive). REQUIRES APPROVAL.",
    parameters: { automationId: { type: "string", required: true, description: "Automation id" } },
    requiresApproval: true,
    kind: "risky-action",
    execute: (args) => ({ requiresApproval: true, action: "highImpactAutomation", args }),
  },
  {
    name: "startMagicMontage",
    description: "Open Magic montage and start the generation plan. REQUIRES APPROVAL because generation can consume provider credits.",
    parameters: {
      prompt: { type: "string", required: true, description: "Video brief" },
      durationSec: { type: "number", default: 120, description: "Requested duration in seconds" },
      language: { type: "string", default: "Русский", description: "Generation language" },
      aspectRatio: { type: "string", enum: ["16:9", "9:16", "1:1"], default: "16:9", description: "Video aspect ratio" },
    },
    requiresApproval: true,
    kind: "risky-action",
    execute: (args) => ({ requiresApproval: true, action: "startMagicMontage", args }),
  },
];

/**
 * The complete tool/action registry. Keys are tool/action names; values are
 * `ToolRegistryEntry` records. The system prompt builder, the route handler,
 * and the UI all read this registry.
 */
export const TOOL_REGISTRY: Record<string, ToolRegistryEntry> = Object.fromEntries(
  [...buildReadEntries(), ...SAFE_ACTION_ENTRIES, ...RISKY_ACTION_ENTRIES].map(
    (e) => [e.name, e],
  ),
);

/** List of all safe-action names (auto-executed). */
export const SAFE_ACTION_NAMES_FROM_REGISTRY = SAFE_ACTION_ENTRIES.map((e) => e.name);
/** List of all risky-action names (require approval). */
export const RISKY_ACTION_NAMES_FROM_REGISTRY = RISKY_ACTION_ENTRIES.map((e) => e.name);
/** Total entry count (read tools + safe + risky actions). */
export const TOOL_REGISTRY_SIZE = Object.keys(TOOL_REGISTRY).length;
