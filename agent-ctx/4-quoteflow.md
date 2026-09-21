# Task 4 — QuoteFlow (agent record)

**Agent:** full-stack-developer (QuoteFlow)
**Task ID:** 4
**Status:** ✅ Complete
**Verified:** `bunx eslint src/modules/quoteflow/ src/lib/i18n.ts src/lib/modules/registry.ts` clean · `bunx tsc --noEmit` shows 0 errors in any quoteflow file · `quoteflow` slot wired into registry · dev server compiles cleanly · `GET /` returns 200

## What landed

### Module structure (`src/modules/quoteflow/`)

| File | Purpose |
|---|---|
| `index.ts` | Public barrel. Default-exports `QuoteFlowView`; re-exports all pricing-engine + data-layer + view-level types. |
| `types.ts` | Consolidated public type surface. Re-exports pricing-engine + data-layer types; defines `QuoteFlowTab`, `CatalogSubTab`, `BuilderSeed`, `QuoteFlowViewProps`, `QuoteFlowStatus` (union of `QuoteStatus \| QuoteRequestStatus \| ApprovalStatus`). |
| `pricing.ts` | Pure deterministic pricing engine. `calculateQuote(items, quoteDiscount, taxRate, cost?, currency?, rulesById?)` — supports percent/fixed discounts, tiered qty-break rules, minimum price, setup fee, recurring, markup. NO eval. Round 2 decimals via `round2()`. Also exports `calculateLineItem`, `applyRule`, `summarizeCalculation`. |
| `data.ts` | In-memory data layer. Re-exports foundation `mockQuotes` (8), `mockProducts` (12), `mockLeads`, `mockCustomers`. Adds: 5 `mockPricingRules` (one per rule type), 3 `mockPriceBooks` (Base/EMEA/APAC), 4 `mockTemplates` (HY/RU/EN + Lite), 5 `mockApprovals`, 8 `mockGeneratedDocuments`, 5 `mockShareLinks`, 27 `mockQuoteActivity` entries, 8 `mockQuoteRequests`. Helpers `resolveQuoteParty`, `resolveQuoteOwner`, `quoteToLineItems`. |
| `QuoteFlowView.tsx` | Top-level view. 7 tabs (Requests / Quotes / Builder / Catalog / Approvals / Analytics / Settings). Holds the `builderSeed` state and the `openBuilder` callback (which fires the "prefilled" toast). Renders `<QuoteBuilder key={builderKey} seed={builderSeed} />` so the builder fully remounts when the seed changes — keeping the builder effect-free. |
| `components/RequestsView.tsx` | Inbound quote requests table with status pills, search, "Create quote from request" → Builder prefilled (passes `{ requestId, leadId, customerId, budget }` to `openBuilder`). |
| `components/QuotesView.tsx` | Quotes table: number, customer (resolved from lead/customer), status badge (color-graded), currency, total, validUntil, version, owner, createdAt. Sortable on total/validUntil/createdAt. Sticky-header. Row click → `QuoteDetail` Sheet drawer. |
| `components/QuoteBuilder.tsx` | CENTERPIECE CPQ builder. 2-column grid (form / sticky totals panel). Header card (customer Select, lead Select, currency Select, valid-until date, template Select). Line-items editor table (product Select → auto-fills unitPrice; qty; discount value+type; live line total; move-up/down/remove). Pricing-rules selector (toggle buttons for each of the 5 rules). Quote discount (value+type) + tax rate + notes Textarea. **Live totals panel** recompute on every keystroke via `calculateQuote` (subtotal, line discounts, quote discount, total discount, tax, grand total, margin, margin %). Actions: Save Draft / Request Approval / Generate PDF (toast) / Generate DOCX (toast). Live preview snippet with stable quote number. |
| `components/QuoteDetail.tsx` | Sheet drawer (right, 2xl wide). Header: status badge + version badge + number + customer/owner. Summary: 4-stat grid (subtotal/discount/tax/total) + 3-stat grid (currency/validUntil/createdAt) + line-items table. **Version history** timeline. **Approvals** section (status badge + threshold + discount/margin/approver). **Generated documents** list (PDF/DOCX with mock download toast). **Client share** section (token, expiry, view count, last viewed, Copy link, Open share view → ClientShareView Dialog, Revoke button). **Activity & audit** vertical timeline with per-type icons (created/updated/sent/viewed/accepted/rejected/revised/approval_requested/approval_decided/document_generated/share_created/share_revoked/expired). Footer actions: Send (lime) / Accept (lime) / Reject (rose) / Revise→new version (cyan) / Delete (rose ghost). |
| `components/CatalogView.tsx` | Sub-tabbed Catalog: Products / Price Books / Pricing Rules / Templates (framer-motion pill). |
| `components/CatalogProducts.tsx` | Searchable + currency-filterable product grid. CRUD via Dialog (mock — toast on save). Each card: SKU (mono), name, description, price + currency, unit, stock badge (In stock lime / Low amber / Unlimited). |
| `components/PriceBooksView.tsx` | 3 price books (Base list / EMEA-EUR / APAC-USD). Card selector with glow on active. Rates table: product, SKU, base price, book price, Δ% (color-graded — lime if discount, rose if markup). |
| `components/PricingRulesView.tsx` | 5 pricing rules (tiered/minimum/setup/recurring/markup) with rule-type icons. Edit Dialog with rule-type-specific config (tiers for tiered, minPrice for minimum, setupFee for setup, recurringPeriod for recurring, markupPct for markup). **Sample application** panel: plug a sample qty + unit price, see the rule's effect live. |
| `components/ApprovalsView.tsx` | Pending approvals queue (sticky-header table): quote number + customer, threshold, discount %, margin %, value, approver, requested relative-time, Approve (lime) / Reject (rose) buttons (in-memory mutation + toast). History section below with status-colored badges + reason. |
| `components/TemplatesView.tsx` | Card grid (4 templates HY/RU/EN + Lite). Each card: name, language badge (color-graded — HY lime, RU cyan, EN amber), section count, line-clamped preview, "Make default" + "Preview" buttons. Preview Dialog shows the full template body in a ScrollArea + section badges. |
| `components/AnalyticsView.tsx` | 6 KPI cards (total quotes, accepted, conversion %, pipeline value, avg discount %, win rate %) + 4 recharts: sent-vs-accepted BarChart, value-over-time AreaChart (with cyan gradient), win-rate-by-owner horizontal BarChart (cells color-graded: ≥50% lime / ≥25% amber / else rose), discount-trend LineChart. All using CSS variable colors from globals.css. |
| `components/ClientShareView.tsx` | Simulated branded client Dialog. Header: HayDev HQ badge + quote number + "expires in X days" (rose if expired). Parties grid (from/to). Items table. Totals (subtotal, discount −, tax, grand total lime). Accept (lime primary) / Decline (rose outline) buttons — disabled if expired. Post-decision success/rejection card. "Powered by HayDevOS QuoteFlow" footer. |
| `components/SettingsView.tsx` | 4-card layout: Currencies CRUD (code + symbol + add/remove), Tax rates CRUD (name + rate), Numbering (prefix + next number + live preview), Approval thresholds (discount %, margin %, value). Default-templates card with per-locale Selects (HY/RU/EN). Save button → toast. |

### Foundation modifications

| File | Change |
|---|---|
| `src/lib/modules/registry.ts` | Imported `QuoteFlowView` and replaced `placeholderFor("quoteflow")` with it. Other 10 module entries untouched. |
| `src/lib/i18n.ts` | No changes needed — all `quoteflow.*` keys were already present in all three locale blocks (en at lines 1180-1458, hy at 2337-2612, ru at 3742-4017) from a prior partial attempt. Verified the full coverage: title/subtitle, 7 top-level tabs + 4 catalog sub-tabs, requests/quotes/builder/detail/catalog/pricebooks/rules/approvals/templates/analytics/clientShare/settings vocabularies. |

## Verification

- ✅ `bunx eslint src/modules/quoteflow/ src/lib/i18n.ts src/lib/modules/registry.ts` — 0 errors, 0 warnings
- ✅ `bunx tsc --noEmit` — 0 errors in any `src/modules/quoteflow/**` file, in `src/lib/i18n.ts`, or in `src/lib/modules/registry.ts`
- ✅ Default export `QuoteFlowView` reachable from `@/modules/quoteflow`
- ✅ `quoteflow` slot in the registry now renders the real view (was placeholder)
- ✅ All visible strings flow through `t()` from `useLocale()`
- ✅ Premium dark enterprise theme honoured — graphite surfaces, lime (accept/approve) + cyan (info) + amber (pending/discount) + rose (rejected/expired). NO indigo/blue.
- ✅ Responsive — tables wrapped in sticky-header `overflow-y-auto`, builder grid `1fr_320px` on lg+ and stacks on mobile, Sheet drawers go full-width on mobile
- ✅ Pure pricing engine — `calculateQuote` is deterministic, no eval, supports percent/fixed discounts, tiered qty-break rules, minimum price, setup fee, recurring, markup. Round 2 decimals via `round2()`.
- ✅ Live totals panel recomputes on every keystroke using the pricing engine
- ✅ QuoteDetail drawer shows version-history + approvals + generated-docs + client-share + activity/audit timeline
- ✅ ClientShareView simulates the branded client page with Accept/Reject + expiry
- ✅ Analytics with 6 KPIs + 4 recharts (all `isAnimationActive={false}` for snappy SSR; CSS variable colors)

## Key design decisions

1. **`key`-based remount for the builder** — the parent `QuoteFlowView` passes `key={builderKey}` (derived from `requestId/leadId/customerId`) to `QuoteBuilder`. When the user clicks "Create quote from request" or "New quote", the builder fully remounts and seeds its initial state via lazy `useState(() => deriveInitialState(seed))`. This avoids the `react-hooks/set-state-in-effect` lint error that the prior attempt's `useEffect`-based seed sync was tripping. Same pattern the Automation module's VisualBuilder uses.

2. **Dirty-tracking via wrapped mutators** — the prior attempt used `useEffect(() => setDirty(true), [every-state-dep])` which trips `react-hooks/set-state-in-effect`. Replaced with explicit `markDirty()` calls inside wrapped state mutators (`setLeadId`, `setCurrency`, `setQuoteDiscountValue`, `updateLine`, `addLine`, `removeLine`, `moveLine`, etc.). Each event handler now flips `dirty` synchronously — no effect, no cascading render. Save Draft and Request Approval reset `dirty` to `false`.

3. **Stable preview quote number** — the prior attempt used `Math.random()` inside the live preview JSX, which reshuffled the preview number on every keystroke. Replaced with `useState(() => previewNumber)` lazy initial state — stable per builder mount, regenerates only when the user starts a new quote (via the remount key).

4. **Pricing-engine signature alignment** — the spec contract is `calculateQuote(items, quoteDiscount, taxRate, cost?)`. The prior impl used `(items, quoteDiscount, taxRate, currency, rulesById)` which differs in the 4th positional arg. Aligned the signature to `(items, quoteDiscount, taxRate, cost?, currency?, rulesById?)` so the public contract matches the spec while the builder can still pass currency + the rules registry as optional trailing args. The new `cost` parameter is a fallback per-unit cost applied to line items that don't carry their own `unitCost`.

5. **Public type surface consolidated in `types.ts`** — the spec required a `types.ts` file. Created it as a re-export barrel for pricing-engine + data-layer types, plus the view-level types (`QuoteFlowTab`, `CatalogSubTab`, `BuilderSeed`, `QuoteFlowViewProps`, `QuoteFlowStatus`). Downstream consumers can `import type { ... } from "@/modules/quoteflow"` without chasing files. The pricing-engine and data-layer files remain the source of truth (no duplication).

6. **Toast fired from the parent, not the effect** — the prior attempt fired `toast.info("Prefilled from request...")` inside the builder's seed-sync `useEffect`. With the new key-based remount pattern, the toast moved to `QuoteFlowView.openBuilder` (an event-handler side-effect, not an effect) — fires once when the user clicks "Create quote from request", before the tab switch.

7. **QuoteDetail as a Sheet drawer (not a route)** — per spec, `QuoteDetail` is opened from the QuotesView row click as a right-side Sheet drawer. It contains the full quote, version-history timeline, approvals, generated-docs list, client share section, activity/audit timeline, and footer actions. The Sheet is `sm:max-w-2xl` on desktop and full-width on mobile.

8. **TemplatesView + ClientShareView reachable** — the prior attempt had both components built but the spec listed them as required views. TemplatesView is reachable as a sub-tab of the Catalog tab (Catalog > Templates) and ClientShareView is reachable as a Dialog opened from QuoteDetail's "Open share view" button. Both are fully functional and use the design tokens.

## Hand-off notes for downstream agents

- The `quoteflow` module slot in `registry.ts` is now taken. The remaining placeholders are: `docsmart` (taken by DocumentFlowView from a prior task), `connect`, `control`, `ownerAi`, `audit`, `settings`.
- The QuoteFlow i18n keys are present in all three locale blocks. Downstream agents don't need to add more quoteflow keys.
- The QuoteFlow data layer is in `src/modules/quoteflow/data.ts`. It re-exports the foundation `mockQuotes` / `mockProducts` / `mockLeads` / `mockCustomers` and adds QuoteFlow-specific datasets (rules, price books, templates, approvals, generated docs, share links, activity, requests). All records are `orgId: "org_haydev"`.
- The pricing engine in `src/modules/quoteflow/pricing.ts` is pure and side-effect-free. The public signature is `(items, quoteDiscount, taxRate, cost?, currency?, rulesById?)`. If you need to compute a quote's totals from outside the module, import `calculateQuote` from `@/modules/quoteflow`.
- The QuoteBuilder uses `key={builderKey}` to remount on seed change. If you wrap `QuoteBuilder` in another component, preserve that key prop.
- The QuoteDetail drawer's "Open share view" button renders `<ClientShareView>` as a child Dialog (with a `trigger` prop). The pattern is: pass a Button as the trigger; the ClientShareView manages its own Dialog open state internally.
- The activity/audit timeline in QuoteDetail uses a vertical stepper with a left rail and per-type icons (`ACTIVITY_ICON` map in the file). If you build other timeline surfaces (e.g., for ERP invoices), consider reusing the same visual pattern.
- If you add a new pricing rule type, update the `PricingRuleType` union + the `RULE_ICON` map in `PricingRulesView.tsx` + the `applyRule` switch in `pricing.ts`.

## Files created/modified

| File | Action |
|---|---|
| `src/modules/quoteflow/types.ts` | new (consolidated public type surface) |
| `src/modules/quoteflow/pricing.ts` | modified (calculateQuote signature aligned to spec; cost fallback logic added) |
| `src/modules/quoteflow/components/QuoteBuilder.tsx` | modified (removed react-hooks/set-state-in-effect errors; lazy initial state + dirty-wrapping mutators; stable preview number; updated calculateQuote call site) |
| `src/modules/quoteflow/QuoteFlowView.tsx` | modified (added `key` on QuoteBuilder; toast fires from openBuilder) |
| `src/modules/quoteflow/index.ts` | modified (re-exports view-level types; fixed stale "Task 12" comment) |
| `src/lib/modules/registry.ts` | modified (wired `QuoteFlowView` into quoteflow slot) |
| `src/modules/quoteflow/data.ts` | pre-existing — kept as-is (verified clean) |
| `src/modules/quoteflow/components/RequestsView.tsx` | pre-existing — kept as-is |
| `src/modules/quoteflow/components/QuotesView.tsx` | pre-existing — kept as-is |
| `src/modules/quoteflow/components/QuoteDetail.tsx` | pre-existing — kept as-is |
| `src/modules/quoteflow/components/CatalogView.tsx` | pre-existing — kept as-is |
| `src/modules/quoteflow/components/CatalogProducts.tsx` | pre-existing — kept as-is |
| `src/modules/quoteflow/components/PriceBooksView.tsx` | pre-existing — kept as-is |
| `src/modules/quoteflow/components/PricingRulesView.tsx` | pre-existing — kept as-is |
| `src/modules/quoteflow/components/TemplatesView.tsx` | pre-existing — kept as-is |
| `src/modules/quoteflow/components/ApprovalsView.tsx` | pre-existing — kept as-is |
| `src/modules/quoteflow/components/AnalyticsView.tsx` | pre-existing — kept as-is |
| `src/modules/quoteflow/components/ClientShareView.tsx` | pre-existing — kept as-is |
| `src/modules/quoteflow/components/SettingsView.tsx` | pre-existing — kept as-is |
