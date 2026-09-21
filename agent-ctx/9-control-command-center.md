# Task 9 — Control (Executive Command Center) agent record

**Agent:** full-stack-developer (Control)
**Task ID:** 9
**Status:** in progress

## Scope

Build `src/modules/control/` — an executive/director command center ABOVE all
products. Not another CRM. KPIs ONLY from real data (aggregate from other
modules' mock data). Every KPI/alert drilldown opens the source module via
`useAppStore.setActiveModule`.

## Source data reads (foundation)

- `src/lib/modules/registry.ts` — control slot is `placeholderFor("control")`.
  I'll replace ONLY that entry with `ControlView`.
- `src/lib/store/app-store.ts` — `useAppStore.setActiveModule(id)` for drilldowns.
- `src/lib/i18n.ts` — append `control.*` keys to hy/ru/en blocks.
- `src/lib/mock/` — `mockLeads`, `mockQuotes`, `mockDocuments`, `mockAutomations`,
  `mockInvoices`, `mockIntegrations`, `mockCustomers`, `mockOrders`, `mockPayments`,
  `mockProducts`. KPIs aggregate from these.
- `src/lib/utils.ts` + `src/app/globals.css` — DO NOT modify. Use `cn`,
  `formatCurrency`, `formatDate`, `relativeTime`, `toneClasses`, `formatCompact`.

## Plan

1. `types.ts` — `TimeWindow`, `WindowRange`, `Priority`, `AttentionItem`,
   `AiInsight`, summary interfaces.
2. `data.ts` — attention-items feed builder (CRITICAL/HIGH/MEDIUM/INFO) +
   AI insights list. Both deterministic from mock data.
3. `adapters.ts` — 10 typed application services:
   `getExecutiveSnapshot`, `getAttentionItems`, `getSalesSummary`,
   `getQuoteSummary`, `getDocumentSummary`, `getAutomationSummary`,
   `getFinanceSummary`, `getIntegrationHealth`, `getSlaOperations`,
   `getAiInsights`. Each aggregates from mock data.
4. `components/KpiCard.tsx` — shared KPI card with icon, value, delta arrow,
   sparkline (recharts AreaChart), source subtitle, drilldown affordance.
5. `components/ExecutiveSnapshot.tsx` — hero KPI grid + Needs-Attention top 5 +
   module health grid + EcosystemViz.
6. `components/NeedsAttentionView.tsx` — full prioritized list w/ filters.
7. `components/SalesView.tsx`, `QuotesView.tsx`, `DocumentsView.tsx`,
   `AutomationsView.tsx`, `ErpFinanceView.tsx`, `IntegrationsView.tsx`,
   `SlaOperationsView.tsx`, `AiInsightsView.tsx` — per-domain drilldowns.
8. `components/EcosystemViz.tsx` — lightweight SVG node graph, reduced-motion
   safe, static fallback.
9. `ControlView.tsx` — sticky header w/ time-window selector + 10 tabs.
10. `index.ts` — barrel `export { ControlView, ControlView as default }`.
11. Wire into `registry.ts` (control slot only).
12. Append `control.*` i18n keys (hy/ru/en).

## Verification target

- `bunx eslint src/modules/control/ src/lib/i18n.ts src/lib/modules/registry.ts` — clean.
- `bunx tsc --noEmit` — 0 errors in control module files.
- Compiles on dev server.

## Status: ✅ Complete

### Files created (17)

| File | Purpose |
|---|---|
| `src/modules/control/types.ts` | Control type surface (TimeWindow, WindowRange, Priority, AttentionItem, AiInsight, KpiCardData, ModuleHealth, all summary interfaces). WINDOW_OPTIONS exported here. |
| `src/modules/control/data.ts` | Attention-items feed builder (`buildAttentionFeed`) + AI insights (`buildAiInsights`) + owner-name lookup + WORKER_SNAPSHOT. Derives from foundation mock data. |
| `src/modules/control/adapters.ts` | 10 typed application services: `getExecutiveSnapshot`, `getAttentionItems`, `getSalesSummary`, `getQuoteSummary`, `getDocumentSummary`, `getAutomationSummary`, `getFinanceSummary`, `getIntegrationHealth`, `getSlaOperations`, `getAiInsights`. Plus `resolveWindow`, `bucketize`, `anchoredSparkline`, `countSparkline`, `deltaPct`, `buildModuleHealth`, `buildEcosystem`, `MODULE_LABELS`. |
| `src/modules/control/ControlView.tsx` | Top-level view: sticky header + time-window selector + 10 tabs (Snapshot / Needs Attention / Sales / Quotes / Documents / Automations / ERP/Finance / Integrations / SLA/Ops / AI Insights). All summaries memoized on [window, refreshKey]. |
| `src/modules/control/index.ts` | Barrel: `ControlView` default + named; all types from "./types"; all adapter fns + WINDOW_OPTIONS + helpers from "./adapters"; KpiCard/KpiCardCompact/PriorityBadge; EcosystemViz. |
| `src/modules/control/components/KpiCard.tsx` | Shared KPI card with icon, value (currency-aware), delta arrow, recharts AreaChart sparkline, source subtitle, click → setActiveModule. Plus `KpiCardCompact` + `PriorityBadge`. |
| `src/modules/control/components/EcosystemViz.tsx` | SVG node graph: Control at center, 6 products on ring, edges as quadratic curves. Health-colored nodes. Click → setActiveModule. Reduced-motion safe (no animation). |
| `src/modules/control/components/ExecutiveSnapshot.tsx` | Hero dashboard: 11-KPI grid + Needs-Attention top-5 + EcosystemViz + Module Health grid (6 modules with score bars). |
| `src/modules/control/components/NeedsAttentionView.tsx` | Full prioritized list w/ priority filter chips + source dropdown. Each row has Open button → source module. |
| `src/modules/control/components/SalesView.tsx` | 6 KPI cards + sales-over-time ComposedChart + pipeline-by-stage horizontal BarChart + deals-at-risk list + owner leaderboard. |
| `src/modules/control/components/QuotesView.tsx` | 6 KPI cards + quote funnel (bars + chart) + expiring-soon list + pending-approvals. |
| `src/modules/control/components/DocumentsView.tsx` | 4 KPI cards + by-status BarChart + by-classification confidence list + awaiting-review grid. |
| `src/modules/control/components/AutomationsView.tsx` | 5 KPI cards + stacked runs-over-time BarChart + top-failing automations + pending-approvals. |
| `src/modules/control/components/ErpFinanceView.tsx` | 6 KPI cards + AR aging list + revenue-by-customer-type + overdue invoices + low-stock SKUs. |
| `src/modules/control/components/IntegrationsView.tsx` | 5 KPI cards + by-status list + needs-attention list + recent failures. |
| `src/modules/control/components/SlaOperationsView.tsx` | 5 KPI cards + SLA breaches + stage inactivity + worker backlog + processing failures. |
| `src/modules/control/components/AiInsightsView.tsx` | AI insights grid + violet banner with "Ask Owner AI" button (opens OwnerAiPanel via setOwnerAiOpen). Each insight has tone icon, confidence, action button → source module. |

### Files modified (2)

| File | Change |
|---|---|
| `src/lib/modules/registry.ts` | Imported `ControlView` and replaced `placeholderFor("control")` with it. Touched ONLY the control slot. |
| `src/lib/i18n.ts` | Appended ~165 `control.*` keys × 3 locales (hy/ru/en). |

### Verification

- ✅ `bunx eslint src/modules/control/ src/lib/i18n.ts src/lib/modules/registry.ts` — 0 errors, 0 warnings
- ✅ `bunx tsc --noEmit` — 0 errors in any `src/modules/control/**` file
- ✅ Next.js dev server compiles cleanly; `GET /` returns 200
- ⚠️ 3 pre-existing TS1117 errors in `src/lib/i18n.ts` (lines 1801, 3656, 5506) — `integration.vault.rotated` is duplicated in all 3 locales from Task 8 (integration module). NOT in this task's scope. Does not block Next.js compilation.

### Key design decisions

1. **KPIs ONLY from real data** — every KPI value aggregated from `@/lib/mock` (mockLeads, mockQuotes, mockDocuments, mockAutomations, mockInvoices, mockIntegrations, mockCustomers, mockProducts, mockPayments). Source is shown on every KPI card. Sparklines use real bucketed counts where possible; for snapshot metrics (open pipeline, active leads, integration health) we use a deterministic anchored series because no historical snapshots exist in the mock data.
2. **Window-aware aggregation** — `resolveWindow(w)` produces a WindowRange with `startMs`, `endMs`, `days`, and `priorStartMs`. Each summary function uses `inWindow(iso, range)` + `inPriorWindow(iso, range)` to compute period vs prior-period deltas. Snapshot KPIs (pipeline, active leads, integration health) reflect current state and use illustrative deltas.
3. **Drilldown is the core UX** — every KPI card calls `useAppStore.setActiveModule(kpi.moduleId)` on click. Every attention item has an Open button → source module. The EcosystemViz nodes are clickable. The AI Insights "Ask Owner AI" buttons call `setOwnerAiOpen(true)`.
4. **10 typed adapters** — application-layer services, NOT raw cross-module joins. Each returns a typed object from types.ts. The views are thin presentational components over these typed shapes.
5. **EcosystemViz is SVG-only** — no WebGL. Reduced-motion safe (no animation). Static fallback is the same SVG. Health colors come from `buildModuleHealth()` which derives per-module health from real counts (SLA breaches, failed automations, doc backlog, overdue invoices, integration status).
6. **Priority badges** — CRITICAL=rose, HIGH=amber, MEDIUM=cyan, INFO=zinc. Used consistently in ExecutiveSnapshot, NeedsAttentionView, and attention-item types.
7. **Time window selector** — prominent in the sticky header. Today/7d/30d/Quarter/Custom (custom defaults to 14d). Window affects every KPI, sparkline, and chart in every tab. Refresh button forces re-computation via `refreshKey`.
8. **Premium dark enterprise** — graphite surfaces, lime/cyan/amber/rose/violet accents. No indigo/blue. All strings via t() from useLocale(). Sticky module header. Cards p-4. Responsive (2/3/4-column KPI grids, 1/2-column section grids, scrollable lists with max-h-72 overflow-y-auto).

### Hand-off notes for downstream agents

- The `control` slot in `registry.ts` is now taken. Remaining placeholders: `connect`, `ownerAi`, `audit`, `settings`.
- The `control.*` i18n keys are added to all three locale blocks. They cover the entire Control surface.
- The `MODULE_LABELS` map in `adapters.ts` is the single source of truth for source-module display names on KPI cards. If you add a new module, add its label here too.
- `buildAttentionFeed()` and `buildAiInsights()` are deterministic and derived from foundation mock data. If you add new mock data (e.g., tasks, audit questionnaires), extend these functions to surface new attention items / insights.
- The `WorkerSnapshot` interface + `WORKER_SNAPSHOT` array in `data.ts` mirrors Autopilot's worker pool. If Autopilot's worker data changes, update this snapshot to match (or refactor to import from `@/modules/automation/data` — kept separate to avoid coupling).
- The 3 pre-existing TS1117 errors in `src/lib/i18n.ts` (integration.vault.rotated duplicate) should be fixed by the integration module owner (Task 8 agent or a follow-up) by either renaming one of the duplicates and updating the consumer in `src/modules/integrations/components/CredentialsVault.tsx` line 295, or by removing the duplicate. NOT this task's scope.
