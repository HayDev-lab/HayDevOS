# Task 7 — ERP/CRM (agent record)

**Agent:** full-stack-developer (ERP/CRM)
**Task ID:** 7
**Status:** ✅ Complete
**Verified:** `eslint src/modules/erp/ src/lib/i18n.ts src/lib/modules/registry.ts` clean · `tsc --noEmit` zero errors in ERP files · `GET /?module=erphub` returns 200

## What landed

The `src/modules/erp/` module was already 95% built from a prior timed-out run. This agent's job was to verify completeness, fix issues, and ensure the module meets the ERP/CRM spec.

### Module structure (`src/modules/erp/`)

| File | Purpose |
|---|---|
| `index.ts` | Barrel — default + named `ErpCrmView`, re-exports the data layer. |
| `data.ts` (978 lines) | In-memory data layer. Re-exports foundation `mockCustomers` / `mockOrders` / `mockInvoices` / `mockPayments` / `mockProducts` and extends each with ERP-specific fields (credit limit, outstanding balance, line items, fulfillment, timelines, paid amounts, cost/category/reorder, etc.). Final counts: **12 customers, 12 orders, 12 products, 11 invoices, 8 payments, 4 suppliers, 4 purchase orders, 12 inventory movements, 7 tasks, 5 integration-health cards**, full `ErpFinancialSummary` (revenue MTD, AR/AP outstanding, aging buckets, monthly series, margins), lookup helpers (`customerById`, `productById`, `invoiceById`, `orderById`, `paymentsForInvoice`, `ordersForCustomer`, `invoicesForCustomer`, `paymentsForCustomer`, `invoiceAgingBucket`, `invoiceOutstanding`, `lowStockProducts`, `openOrdersCount`, `productMarginPct`). |
| `ErpCrmView.tsx` | 10-tab view: Dashboard \| Customers \| Orders \| Products \| Inventory \| Invoices \| Payments \| Reports \| Operations \| Settings. Framer-motion fade between tabs. Header carries `AiProtectedBadge` + "High-Risk Financial Action" amber badge. |
| `components/shared.tsx` | `AiProtectedBadge` (amber ShieldCheck on financial tables), `HighRiskConfirm` (AlertDialog with amber ShieldAlert header, destructive/primary tone, explicit confirm required), `StatusBadge`, `ErpEmptyState`, `ErpSectionHeader`. |
| `components/ErpDashboard.tsx` | 6 KPI cards (revenue MTD w/ delta, open orders, AR outstanding, AP outstanding, low-stock count, net margin) → aging BarChart (current/1-30/31-60/60+ color-coded) → revenue-vs-expense AreaChart (lime/rose gradients) → top-products horizontal BarChart + low-stock alert list → recent-orders list + integration-health cards (Control / QuoteFlow / DocumentFlow / Autopilot / LeadOS) showing status sync, last sync, event count. |
| `components/CustomersView.tsx` | Sticky-header table (name, type, email, phone, orders, revenue, balance, status) + search + type filter. Row click → CustomerDetail Sheet drawer (profile, credit-limit progress bar w/ tone-graded fill, order history, invoice history, payment history, notes). |
| `components/OrdersView.tsx` | Sticky-header table (number, customer, date, items, total, status) + search + status filter. NewOrderDialog (customer Select + add/remove line items + live subtotal/tax/total). OrderDetail Sheet drawer (line items w/ totals, fulfillment summary, linked invoice, timeline stepper, notes). |
| `components/ProductsView.tsx` | Catalog table (sku, name, category, price, cost, margin, stock, status) + search + category filter. ProductDialog for CRUD with live margin calc (tone-graded). Delete via HighRiskConfirm. |
| `components/InventoryView.tsx` | 2-tab view: warehouse stock (sku, name, location, on-hand, reserved, available, reorder) + movements history. Low-stock rows highlighted amber. StockAdjustDialog (product/type/qty/reason) with HighRiskConfirm showing before/after stock preview. |
| `components/InvoicesView.tsx` | Sticky-header table (number, customer, issue/due date, amount, paid, balance, status) + search + status filter + aging tone coloring. InvoiceDetail Sheet drawer (4-cell summary grid, line items, totals breakdown, payments list, status timeline stepper, Record Payment/Send/Cancel/Refund actions — first/last gated by HighRiskConfirm). Aging badge in drawer header. |
| `components/PaymentsView.tsx` | 2-col layout: payments table (date, invoice, customer, method badge color-coded by method, reference, amount) + method-breakdown PieChart (card/bank/cash/crypto/wallet). RecordPaymentDialog with invoice select + amount + method + reference + HighRiskConfirm. |
| `components/ReportsView.tsx` | 5-tab reports: P&L (table + BarChart), AR aging (table + colored BarChart), sales by product (table + horizontal BarChart), sales by customer (table + BarChart), inventory valuation (table + BarChart). Date-range Select + Export button (toast). |
| `components/OperationsView.tsx` | Fulfillment pipeline (3-column kanban: to ship / shipping / delivered, each w/ status-colored header + scrollable card list) + procurement queue (low-stock → suggested PO w/ supplier + suggested qty + total + Create PO button) + tasks list (priority badge, overdue highlighting, status icon). |
| `components/SettingsView.tsx` | 7-tab settings: chart of accounts (14 mock accounts w/ type badges + DR/CR), tax rates (5 regions), currencies (5 w/ FX rate), numbering (6 sequences), warehouses (3 w/ capacity bars), payment methods (5 w/ Switch toggles), roles/permissions matrix (5 roles × 5 perms with Check/X). |

### Foundation modifications

| File | Change |
|---|---|
| `src/lib/modules/registry.ts` | `erphub` slot already wired to `ErpCrmView` by prior run — verified, no edit needed. |
| `src/lib/i18n.ts` | Appended 3 new keys × 3 locales: `erp.integrations.degraded`, `erp.integrations.error`, `erp.toast.productRequired`. (Existing ~795 `erp.*` keys already covered all visible strings.) |

## Fixes applied during verification

1. **TypeScript TS2430 in `data.ts`**: `ErpOrder extends MockOrder` and `ErpInvoice extends MockInvoice` failed because their `status` unions (ERP adds `draft`/`confirmed`/`cancelled` on top of the base `OrderStatus`/`InvoiceStatus`) aren't assignable to the base type's `status`. Fixed by switching both to `extends Omit<MockOrder, "status">` / `extends Omit<MockInvoice, "status">`. Now `bunx tsc --noEmit` reports zero errors in any ERP file.
2. **IntegrationCard status bug in `ErpDashboard.tsx`**: the badge label was hardcoded to `t("erp.integrations.synced")` regardless of the actual `status` prop (`synced`/`degraded`/`error`). Fixed to look up the correct label key per status. Added `erp.integrations.degraded` + `erp.integrations.error` keys to all three locale blocks.
3. **ProductsView handleSave error toast bug**: the error path was calling `toast.error(t("erp.toast.productSaved"))` — a success message. Fixed to use new `erp.toast.productRequired` key ("SKU and name are required"), added to all three locale blocks.

## Finance safety (KEY requirement)

Every financial mutation routes through `HighRiskConfirm` (AlertDialog with amber `ShieldAlert` header + explicit confirm button + AI-protected messaging):

- **Record payment** (InvoicesView drawer + PaymentsView dialog) → HighRiskConfirm with details panel (invoice / customer / amount / method / reference)
- **Cancel invoice** (InvoicesView drawer) → HighRiskConfirm with details panel, destructive tone
- **Refund invoice** (InvoicesView drawer) → HighRiskConfirm with refund amount, destructive tone
- **Stock adjustment** (InventoryView dialog) → HighRiskConfirm with before/after stock preview, primary tone
- **Product delete** (ProductsView) → HighRiskConfirm, destructive tone

Financial tables (Invoices, Payments, Inventory, Settings) all carry the `AiProtectedBadge` ("AI-protected" amber ShieldCheck badge with tooltip explaining AI cannot auto-mutate financial records).

## Verification

- ✅ `bunx eslint src/modules/erp/ src/lib/i18n.ts src/lib/modules/registry.ts` — 0 errors, 0 warnings
- ✅ `bunx tsc --noEmit` — 0 errors in any `src/modules/erp/**` file (pre-existing errors are only in `examples/` and `skills/` dirs — out of scope)
- ✅ Dev server returns 200 for `GET /?module=erphub` in 278ms; HTML contains "ERP Hub"
- ✅ `✓ Compiled in 247ms` — no runtime errors in dev.log
- ✅ All visible strings flow through `t()` from `useLocale()`
- ✅ Premium dark enterprise theme honoured — graphite surfaces, lime/cyan/amber/rose/violet accents, NO indigo/blue
- ✅ Responsive — tables wrapped in scroll containers with `sticky top-0 z-10 bg-card` headers; card grids collapse 4→2→1 columns; Sheet drawers go full-width on mobile
- ✅ Currency formatting via `formatCurrency(amount, currency)` everywhere
- ✅ Aging buckets color-coded (success/warning/amber/destructive) consistently across dashboard chart, invoices table, reports

## Hand-off notes for downstream agents

- The `erphub` module slot in `registry.ts` is taken. Remaining placeholders: `connect`, `control`, `ownerAi`, `audit`, `settings`.
- The ERP data layer exports both typed collections (`erpCustomers`, `erpOrders`, `erpInvoices`, `erpPayments`, `erpProducts`) and lookup helpers. Downstream modules (e.g., Control KPIs, Owner AI) can import directly from `@/modules/erp` — the barrel re-exports everything.
- The `ErpOrderStatus` and `ErpInvoice.status` types intentionally widen the base mock types (add `draft`/`confirmed`/`cancelled` to match the spec's status list while keeping back-compat with the foundation mock that uses `pending`/`processing`). The `Omit<…, "status">` pattern keeps the override type-safe.
- `HighRiskConfirm` and `AiProtectedBadge` from `@/modules/erp/components/shared` are reusable — if you build other modules with financial mutations, import them rather than re-implementing.
- The integration-health cards on the ErpDashboard reference 5 mock integrations by i18n key (Control / QuoteFlow / DocumentFlow / Autopilot / LeadOS). If you build the Control module, the "Control metrics" card already advertises the contract.
- The mock `erpFinancialSummary` is the canonical numbers block (revenue MTD, AR/AP, aging, margins, monthly series). ReportsView + ErpDashboard both read from it. If you need to reconcile numbers, this is the source of truth.

## Files created/modified

| File | Action |
|---|---|
| `src/modules/erp/index.ts` | (prior run — verified) barrel |
| `src/modules/erp/data.ts` | patched — `ErpOrder`/`ErpInvoice` switched to `Omit<…, "status">` (TS2430 fix) |
| `src/modules/erp/ErpCrmView.tsx` | (prior run — verified) 10-tab view |
| `src/modules/erp/components/shared.tsx` | (prior run — verified) AiProtectedBadge, HighRiskConfirm, StatusBadge, ErpEmptyState, ErpSectionHeader |
| `src/modules/erp/components/ErpDashboard.tsx` | patched — IntegrationCard badge now reflects actual status |
| `src/modules/erp/components/CustomersView.tsx` | (prior run — verified) |
| `src/modules/erp/components/OrdersView.tsx` | (prior run — verified) |
| `src/modules/erp/components/ProductsView.tsx` | patched — handleSave error toast uses `erp.toast.productRequired` |
| `src/modules/erp/components/InventoryView.tsx` | (prior run — verified) |
| `src/modules/erp/components/InvoicesView.tsx` | (prior run — verified) |
| `src/modules/erp/components/PaymentsView.tsx` | (prior run — verified) |
| `src/modules/erp/components/ReportsView.tsx` | (prior run — verified) |
| `src/modules/erp/components/OperationsView.tsx` | (prior run — verified) |
| `src/modules/erp/components/SettingsView.tsx` | (prior run — verified) |
| `src/lib/i18n.ts` | extended (+3 keys × 3 locales) |
| `src/lib/modules/registry.ts` | (prior run — verified, no edit needed) `erphub` slot already wired |
