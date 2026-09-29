# ERP production audit

Date: 2026-09-25

## Current ERP architecture

The registered `erphub` module is a client-rendered demonstration. `ErpCrmView` mounts ten tab components and every business view reads module-level arrays from `src/modules/erp/data.ts`. Mutations change only component state or display a toast. There is no authenticated ERP API or canonical ERP domain service.

## Existing screens

Dashboard, customers, orders, products, inventory, invoices, payments, reports, operations, and settings exist. They provide a useful visual shell, but their KPIs, search results, order details, inventory balances, supplier data, and finance figures are synthetic.

## Synthetic data sources

- `src/modules/erp/data.ts` imports global mock customers, orders, invoices, payments, products, users, tasks, and integrations, then adds hard-coded ERP records and calculated KPIs.
- `src/lib/mock/customers.ts`, `products.ts`, and `invoices.ts` contain fixed `org_haydev` records.
- Order creation, payment recording, invoice actions, stock adjustment, product CRUD, purchase orders, and exports are toast-only or component-local operations.
- Inventory and finance calculations use JavaScript `number`; the payments view applies an implicit synthetic FX multiplier.

## Existing Prisma entities

The baseline already has canonical `Customer`, `Product`, `Order`, `Invoice`, and `Payment` models. `Customer` and `Product` are also used by QuoteFlow, so they must be extended rather than duplicated. Existing `Order`, `Invoice`, and `Payment` are skeletal and do not model items, snapshots, accepted quote versions, currency, status history, reservations, fulfillment, or immutable finance events.

## LeadOS overlap

Leads are authoritative and tenant scoped. A quote may reference a Lead. Customer creation from a quote must retain a source-lead relationship without creating a second Lead/Customer master hierarchy.

## QuoteFlow overlap

QuoteFlow owns pricing, immutable `QuoteVersion` snapshots, acceptance state, and Product master pricing. The accepted version is the only valid quote-to-order source. ERP must copy its customer, line, currency, and Decimal totals without invoking the pricing engine again.

## DocumentFlow overlap

DocumentFlow owns binary artifacts, immutable versions, Storage keys, hashes, and authorization. Its generic `sourceType`/`sourceId` metadata can represent order attachments, but the current upload API cannot tenant-safely bind a document to an order.

## Customer model

`Customer` is the canonical master record. Quotes contain current customer links plus immutable customer snapshots. Orders need their own immutable customer snapshot so later Customer edits do not rewrite business history. The current Customer delete behavior is unsafe for historical records and needs archive semantics.

## Product/service model

`Product` is the canonical catalog record and has tenant-scoped SKU uniqueness and Decimal sale price. It currently has an untyped product kind and a mutable `Float stock` compatibility field. ERP must distinguish stocked, non-stocked, and service items and ignore the legacy stock field as an inventory source of truth.

## Orders

The current model stores only number, customer, status, total, and created time. Its customer FK is not tenant-composite and cascades deletion. There are no order items, accepted QuoteVersion binding, idempotency, currency, snapshots, revision, atomic counter, status history, or audit/domain events.

## Inventory

No PostgreSQL warehouse, balance, reservation, or movement entity exists. The UI derives stock from `Product.stock`, mutates nothing persistently, and contains no negative-stock or concurrency protection.

## Warehouses

Warehouses exist only as UI/settings labels. There is no tenant-scoped warehouse identity or `(organization, warehouse, product)` balance.

## Suppliers

Supplier and purchase-order records are synthetic and have no active production workflow. Gate #6 should not add procurement accounting; controlled inventory receipt with a reference covers the current operational need.

## Finance

The existing `Payment` is tied to `Invoice`, has no status, currency, order binding, actor, reference, idempotency, or reversal relationship. The UI calculates paid/outstanding values in browser numbers and includes implicit currency conversion. No immutable operational finance-event ledger exists.

## Existing calculations

ERP totals, margins, revenue, aging, low stock, and charts are calculated from arrays with JavaScript arithmetic. None are authoritative. QuoteFlow Decimal pricing is reusable; ERP aggregates must preserve currency separation and return decimal strings.

## Owner AI integration

LeadOS, QuoteFlow, and DocumentFlow have authenticated production tool dispatchers. ERP read tools still fall through to mock-era global summaries and there are no canonical ERP mutation executors. The persistent approval mechanism is reusable for confirmations, cancellations, adjustments, transfers, and finance actions.

## Automation integration

Lead and quote automation executors call their domain services. ERP has no executor. `AutomationRun` already provides tenant scoping and idempotency keys and can route ERP actions through the same ERP services.

## Tenant risks

- Order, Invoice, and Payment relations are not composite tenant FKs.
- Client mock records carry a fixed organization.
- There is no server-side authorization boundary for ERP actions.
- Cross-tenant customer, product, warehouse, document, and order relationships are not fully constrained at the database layer.

## Financial risks

- Existing ERP browser calculations use floating point.
- Currency is missing from Order, Invoice, and Payment.
- The client can currently simulate paid/cancelled/refunded states.
- Confirmed financial records have no immutability or reversal-only rule.
- Synthetic reports combine currencies through an unverified FX multiplier.

## Inventory consistency risks

- `Product.stock` is a mutable counter without history.
- No atomic balance/movement update exists.
- Negative inventory, double reservation, partial fulfillment, and transfer half-commit are unguarded.

## Concurrency risks

- Order numbers have no atomic counter.
- Orders have no compare-and-swap revision.
- Inventory has no row locking or deterministic lock order.
- Retried quote acceptance/automation can create duplicate business actions without a unique accepted-version binding.

## Reusable code

- `withTenantApi`, strict Zod parsing, Origin checks, and normalized API errors.
- Session-derived domain context and role model.
- QuoteFlow Decimal/snapshot/state-machine patterns and bounded transaction retry.
- Existing `AuditLog`, `AutomationRun`, and persistent Owner AI approval architecture.
- DocumentFlow server-only services and tenant-safe source metadata.
- Existing shell, tabs, cards, tables, dialogs, badges, and organization-keyed remount behavior.

## Required schema changes

Extend canonical Customer/Product/Order/Payment models; add order items/counter/status events, warehouses, balances, immutable movements/reservations/transfers, fulfillments/items, finance events, and ERP domain events. Add composite tenant FKs, check constraints, query indexes, RLS, least-privilege grants, and immutability triggers. Keep procurement and general-ledger accounting out of this gate.

## Migration plan

1. Add nullable/defaulted compatibility columns and new tables without deleting existing records.
2. Backfill safe defaults, add tenant-composite constraints, then enforce required invariants.
3. Introduce server-only ERP services and authenticated APIs.
4. Replace the registered ERP production view with API-backed state; keep old mock files unreferenced.
5. Integrate DocumentFlow, Owner AI, and Automations through services.
6. Verify on a fresh PostgreSQL database, run tenant/concurrency/HTTP/restart suites, then apply the exact reviewed migration to linked Supabase and reconcile schema/security state.
