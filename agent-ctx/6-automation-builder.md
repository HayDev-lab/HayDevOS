# Task 6 — Automation Builder (agent record)

**Agent:** full-stack-developer (Automation Builder)
**Task ID:** 6
**Status:** ✅ Complete
**Verified:** `eslint src/modules/automation/ src/lib/i18n.ts src/lib/modules/registry.ts` clean · `tsc --noEmit` shows zero errors in automation module · Autopilot slot wired into registry

## What landed

### Module structure (`src/modules/automation/`)

| File | Purpose |
|---|---|
| `index.ts` | Public barrel. Default-exports `AutomationBuilderView`; re-exports all domain types + data accessors. |
| `types.ts` | Typed automation model: `TriggerType` (10 values), `ConditionOp` (7), `ActionType` (13), `Trigger`, `Condition`, `Action`, `Automation`, `AutomationRun`, `ExecutionStep`, `AutomationTemplate`, `Approval`, `Schedule`, `WebhookEndpoint`, `AutomationVariable`, `Worker`, `EngineSettings`. Plus `TRIGGER_TYPES`, `CONDITION_OPS`, `ACTION_TYPES`, `RISKY_ACTIONS`, `isRiskyAction()`. |
| `data.ts` | In-memory data layer. Re-exports foundation `mockAutomations` + adds: 9 typed `automations` (8+), 16 `automationRuns` (15+) with rich step timelines across every run status, 8 `automationTemplates`, 6 `approvals`, 3 `schedules`, 4 `webhookEndpoints`, 7 `automationVariables`, 6 `workers`, `engineSettings`, and 4 analytics rollups (`executionsTimeSeries`, `topAutomationsByRuns`, `failureReasons`, `approvalWaitBuckets`). Helpers `getAutomation(id)`, `getRun(id)`. |
| `AutomationBuilderView.tsx` | Top-level view. 12 tabs (Automations / Builder / Templates / Executions / Failed Jobs / Approvals / Schedules / Webhooks / Variables / Workers / Analytics / Settings). Header stat strip (active automations, pending approvals, failed runs, online workers) with badge counts on the Failed + Approvals tabs. Holds shared in-memory state for automations, approvals, schedules, variables; passes through mutations. |
| `components/AutomationsListView.tsx` | Sticky-header table: name + dedup key, trigger badge, action/condition counts, status pill, success-rate (color-graded), last-run relative time, version, enabled Switch, hover row-actions (pause/activate + edit). Row click → Builder. |
| `components/VisualBuilder.tsx` | CENTERPIECE. 3-column flow `WHEN → IF → THEN` — each column a card with a coloured header (lime/cyan/violet). Trigger column: type Select + key/value ConfigEditor + type-specific hint. Conditions column: add/remove rows (field datalist + op Select + JSON-aware value input). Actions column: action blocks with type Select, ConfigEditor, reorder buttons (GripVertical + Up/Down), and an approval-required Switch that is ON by default for risky actions (send_email/telegram/webhook, create_quote, run_ai_agent) — risky actions get a rose "Risky" badge + rose border. Top bar: name Input, status/version Badge, Save Draft / Dry Run / Test / Activate buttons. Loop Protection badge with max depth + editable dedup-key Input. Reentry policy row (maxDepth + allow/block/queue). Dry-Run side Sheet shows the execution plan as a vertical stepper (Trigger → Conditions → Actions) with JSON payloads and a "zero writes" confirmation banner. |
| `components/TemplatesView.tsx` | Card gallery: 8 templates with category badge, rating, install count, mini WHEN/IF/THEN summary, "Use template" → Builder prefilled (new automation id, status=draft). |
| `components/ExecutionsView.tsx` | Runs table: automation name + id, started (date+relative), duration ms, status pill, trigger source, retry count, causation id. Row click → ExecutionDetail drawer. |
| `components/ExecutionDetail.tsx` | Sheet drawer: 2-col metadata grid (causation id, idempotency key, worker, heartbeat, started, retries) with coloured icons; trigger source block; error block (with errorType badge) when present; **vertical timeline stepper** with status-icon nodes (success/failed/skipped/running/awaiting_approval/retried), per-step duration + retries badges, and input/output JSON payload blocks. Replay button → toast. |
| `components/FailedJobsView.tsx` | Failed-only table with error-type filter Select. Each row: automation, started, errorType badge + message, retry count, Retry + Cancel buttons (toasts). Empty state shows a success check. |
| `components/ApprovalsView.tsx` | Pending approvals queue (2-col card grid): automation + requester + relative-time pill, action label (mono), context snapshot (JSON), stale-context amber warning when older than 24h, Approve/Reject buttons (decision persists in-memory). Approval history card below with status-coloured dots. |
| `components/SchedulesView.tsx` | Cron builder (every N minutes/hours/days + at-time input → live cron preview) + schedules table (automation, timezone, cron, next/last run, last duration, status, pause/activate toggle). |
| `components/WebhooksView.tsx` | Endpoint card grid: name + 24h delivery count, last-delivery status pill, URL row with Copy button (clipboard + toast), masked signing secret (amber mono), event-type badges, last delivery + success rate footer. |
| `components/VariablesView.tsx` | Variables table: key Input (mono), value Input (password type when secret + reveal Eye toggle), secret Switch, scope Select (org/automation), updated relative time, delete button. Add-variable button. Amber info banner about server-side decryption. |
| `components/WorkersView.tsx` | Worker pool status board: summary pills (online/draining/offline + queue total) + per-worker card (status-coloured icon, name, region, current job / idle, heartbeat relative, queue depth, jobs processed, CPU% progress bar color-graded). |
| `components/AnalyticsView.tsx` | 4 KPI cards (total runs, success rate, avg duration, pending approvals) + 4 recharts charts: stacked area (success/failed/awaiting over time), donut (failure reasons), horizontal bar (top automations by runs), vertical bar (approval wait buckets). All using theme tokens (lime/cyan/amber/rose/violet). |
| `components/SettingsView.tsx` | 3-column card layout: Loop protection (maxDepth, reentry policy, dedup TTL) / Retry policy (max retries, backoff strategy, initial/max delay) / Concurrency (max concurrent runs, per-automation limit, queue timeout). Save button → toast. |

### Foundation modifications

| File | Change |
|---|---|
| `src/lib/i18n.ts` | Appended ~245 `automation.*` keys × 3 locales (hy/ru/en) covering every visible string in the module. |
| `src/lib/modules/registry.ts` | Imported `AutomationBuilderView` and replaced `placeholderFor("autopilot")` with it. Other 9 module placeholders untouched. |

## Verification

- ✅ `bunx eslint src/modules/automation/ src/lib/i18n.ts src/lib/modules/registry.ts` — 0 errors, 0 warnings
- ✅ `bunx tsc --noEmit` — 0 errors in any `src/modules/automation/**` file (other modules have pre-existing errors from Tasks 4/5/7 not yet fixed; not this agent's scope)
- ✅ Default export `AutomationBuilderView` reachable from `@/modules/automation`
- ✅ `autopilot` slot in the registry now renders the real view (was placeholder)
- ✅ All visible strings flow through `t()` from `useLocale()`
- ✅ Premium dark enterprise theme honoured — graphite surfaces, lime/cyan/amber/rose/violet accents, NO indigo/blue
- ✅ Responsive — tables wrapped in `ScrollArea` with sticky headers; card grids collapse 4→2→1 columns; Sheet drawers go full-width on mobile
- ✅ Loop protection & approval emphasis present in the visual builder
- ✅ Vertical timeline stepper for execution detail (per spec)
- ✅ Risky actions (send_email/telegram/webhook, create_quote, run_ai_agent) get approval-required ON by default + rose "Risky" badge

## Key design decisions

1. **Local useState seeded once, parent passes `key={automation.id}`** — avoids the `react-hooks/set-state-in-effect` lint rule. When the user picks a different automation from the list, the builder fully remounts; the local useState seeds from the new automation's props on first render, and subsequent edits stay local until Save Draft / Activate commits them via `onPatch`.
2. **3-column WHEN/IF/THEN flow** — each column is a coloured-header card (lime/cyan/violet accents from the design tokens), with coloured borders matching the engine stage. The visual hierarchy reads top-to-bottom inside each column and left-to-right across columns, mimicking real workflow tools (n8n/Zapier-style).
3. **ConfigEditor** is a generic key/value editor used for both trigger config and action config. It parses JSON-y values (numbers/booleans/arrays/objects) back into typed values, so users can paste `["EU", "CIS"]` for an `in` condition value.
4. **Risky actions get a default-on approval toggle** — the `RISKY_ACTIONS` list (send_email, send_telegram, send_webhook, create_quote, run_ai_agent) drives both the rose "Risky" badge + rose border on the action block and the default value of `requiresApproval` when a new action is added or its type is changed to a risky one.
5. **Dry run as a Sheet** — shows the execution plan (Trigger → Conditions → Actions) as a vertical stepper with JSON payloads, plus a "zero writes" confirmation banner. Closing the sheet fires the `dryRunDone` toast.
6. **Execution timeline is a vertical stepper** with a left rail and status-icon nodes — every step (trigger/condition/action) shows kind badge, label, duration, retries badge, status pill, and input/output JSON payload blocks. Error block (with errorType badge) renders above the timeline when present.
7. **Stale approval detection** — approvals older than 24h get an amber warning banner ("Stale context — snapshot older than 24h. Verify before approving."). This drives the human to re-check the context snapshot before approving.
8. **Workers CPU% color-graded** — >80% rose, >50% amber, otherwise success. Queue depth shown in amber. Online workers get a pulsing dot.
9. **Analytics charts use recharts + theme tokens** — stacked AreaChart for executions over time, PieChart donut for failure reasons, horizontal BarChart for top automations by runs, vertical BarChart for approval wait buckets. All `isAnimationActive={false}` to keep SSR/snappy. All colors are CSS variables from `globals.css`.
10. **Cron builder** — every-N minutes/hours/days with optional at-time picker; live cron preview in a cyan-mono badge. Toggling unit hides the at-time picker for minute-level schedules.

## Hand-off notes for downstream agents

- The `autopilot` module slot in `registry.ts` is now taken. The remaining placeholders are: `leados`, `quoteflow` (Task 4 — appears partially done with errors), `docsmart`, `erphub` (Task 7 — has TS errors), `connect`, `control`, `ownerAi`, `audit`, `settings`.
- The mock `mockAutomations` (10 records, foundation) is re-exported from `data.ts` for back-compat. The new typed `automations` (9 records) is the canonical dataset for the Builder surfaces; both coexist.
- The `automation.*` i18n keys are added to all three locale blocks. They cover the entire module surface — downstream agents don't need to add more.
- `RISKY_ACTIONS` is the single source of truth for which actions require approval by default. If you add a new `ActionType`, update `RISKY_ACTIONS` in `types.ts` accordingly.
- The visual builder uses `key={automation.id}` to remount on automation switch — if you wrap `VisualBuilder` in another component, preserve that key prop.
- The execution timeline stepper is intentionally verbose (kind/label/duration/retries/status/input/output per step) to look like a real durable-workflow UI. If you build other timeline surfaces (e.g. audit log), consider reusing the same visual pattern.

## Files created/modified

| File | Action |
|---|---|
| `src/modules/automation/index.ts` | new (barrel) |
| `src/modules/automation/types.ts` | new (typed domain model) |
| `src/modules/automation/data.ts` | new (in-memory data layer + analytics rollups) |
| `src/modules/automation/AutomationBuilderView.tsx` | new (12-tab view) |
| `src/modules/automation/components/AutomationsListView.tsx` | new |
| `src/modules/automation/components/VisualBuilder.tsx` | new (centerpiece) |
| `src/modules/automation/components/TemplatesView.tsx` | new |
| `src/modules/automation/components/ExecutionsView.tsx` | new |
| `src/modules/automation/components/ExecutionDetail.tsx` | new (Sheet drawer + timeline) |
| `src/modules/automation/components/FailedJobsView.tsx` | new |
| `src/modules/automation/components/ApprovalsView.tsx` | new |
| `src/modules/automation/components/SchedulesView.tsx` | new |
| `src/modules/automation/components/WebhooksView.tsx` | new |
| `src/modules/automation/components/VariablesView.tsx` | new |
| `src/modules/automation/components/WorkersView.tsx` | new |
| `src/modules/automation/components/AnalyticsView.tsx` | new |
| `src/modules/automation/components/SettingsView.tsx` | new |
| `src/lib/i18n.ts` | extended (+~245 keys × 3 locales) |
| `src/lib/modules/registry.ts` | wired `AutomationBuilderView` into autopilot slot |
