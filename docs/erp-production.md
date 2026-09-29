# ERP production architecture

## Authority and trust boundary

ERP is a PostgreSQL business domain. The browser renders server responses and sends business intent; it never supplies an authoritative organization, actor, role, state, amount, stock balance, payment status, event, or audit field. Every route resolves the current opaque session and organization membership through `withTenantApi`, validates input with a strict Zod schema, and calls the same services used by Owner AI and automations.

The canonical path is:

```text
ERP UI / Owner AI / Automations
              |
        ERP domain services
              |
     bounded transactions + audit/outbox
              |
             Prisma
              |
       Supabase PostgreSQL
```

`src/modules/erp/data.ts` and the old ERP component files are retained only as unreferenced design history. The production ERP entry point does not import them.

## Domain model

- `Customer` is the one current customer master. It may bind to a tenant-compatible Lead. Quote, order, and invoice customer snapshots remain historical copies.
- `Product` is the canonical product/service master with tenant-scoped SKU and `STOCKED_PRODUCT`, `NON_STOCKED_PRODUCT`, or `SERVICE` type. Its legacy `stock` field is compatibility-only and is not an inventory authority.
- `Order`, `OrderItem`, and `OrderStatusEvent` are the sales record, immutable item snapshot, and append-only lifecycle history.
- `Warehouse`, `InventoryBalance`, `InventoryMovement`, `InventoryReservation`, and `InventoryTransfer` implement inventory. The movement ledger is authoritative; the balance row is an atomically maintained projection.
- `Fulfillment` and `FulfillmentItem` consume reservations and create physical `ISSUE` movements.
- `Payment` records pending, confirmed, voided, refund, and reversal facts. `FinanceEvent` is the append-only operational finance history. This gate intentionally does not implement a general ledger, tax accounting, payroll, bank reconciliation, suppliers, or purchase orders.
- `ERPEvent` is the transactional outbox/audit integration boundary.
- `DocumentRecord.sourceType = ORDER` binds DocumentFlow metadata to an order while DocumentFlow continues to own file bytes and versions.

All quantities and money use PostgreSQL/Prisma Decimal values with four fractional digits. JSON/API representations are strings. Currency is an explicit ISO-style three-letter code; totals are grouped by currency and never implicitly converted.

## Accepted quote to order

`createOrderFromAcceptedQuote(context, quoteId)` is the only conversion operation.

1. A transaction takes a quote-specific advisory lock and reads the current tenant's quote plus its accepted immutable version.
2. Non-accepted quotes or missing accepted-version bindings fail with `409`.
3. A unique database constraint on `Order.sourceQuoteVersionId` guarantees at most one order for an accepted version. Replays return that same order.
4. Customer master data is reused or created within the tenant.
5. Financial, customer, and item values are copied from the accepted `QuoteVersion`; the pricing engine is not rerun.
6. `OrderNumberCounter` atomically allocates `ORD-YYYY-NNNNNN` per tenant and year. The `(orgId, number)` unique constraint is the final race guard.
7. The order, item snapshots, initial status event, audit entry, and ERP outbox event commit together.

Order item name, SKU, unit, quantity, price, discount, tax, total, product type, and currency remain unchanged when the current Product record changes later.

## Order lifecycle and concurrency

The supported lifecycle is `DRAFT -> CONFIRMED -> PROCESSING/PARTIALLY_FULFILLED -> FULFILLED -> COMPLETED`, with cancellation allowed only from valid open states. Confirmation reserves stocked items. Cancellation releases unconsumed reservations. Fulfillment advances partial/full status and completion is explicit.

Every order mutation requires `expectedRevision`. A stale revision fails with `409`; successful state changes increment by exactly one. The database runtime trigger prevents changes to snapshot/financial/source fields and rejects invalid revision changes even if application code is bypassed.

Stock mutations use SERIALIZABLE transactions with bounded retry for PostgreSQL serialization/deadlock conflicts. Balance rows are locked in a deterministic warehouse/product order. Order conversion uses a quote-specific advisory lock plus the atomic counter, keeping unrelated accepted quotes concurrent without weakening exact-once conversion.

## Inventory invariants

For each `(organization, warehouse, product)`:

```text
available = onHand - reserved
onHand >= 0
reserved >= 0
reserved <= onHand
```

The database check constraint enforces these conditions. Each receipt, adjustment, reservation, release, issue, return, or transfer writes the movement and updates the balance in one transaction. Transfers create one linked business record and paired `TRANSFER_OUT`/`TRANSFER_IN` movements in the same transaction. A failed destination/source operation rolls back both sides.

Only stocked products participate in inventory. Confirming two orders against the last available units serializes on the balance row; one may succeed and the other receives a conflict, but overselling cannot commit. Manual adjustments require `OWNER` or `ADMIN` and a non-empty reason.

Read-only reconciliation:

```powershell
npm run db:verify:inventory
```

The command compares movement-derived on-hand/reserved values to materialized balances and exits non-zero on drift. It does not repair or mutate data.

## Fulfillment

Fulfillment is append-only. Each request locks the order, checks its revision and remaining item quantity, consumes only active reserved stock, appends `ISSUE` movements, updates balance/reservation state, writes fulfillment rows, advances the order status, and appends audit/outbox events in one transaction. Over-fulfillment and fulfillment without sufficient reservation fail without partial effects.

## Payments and operational finance

Recording a payment creates `PENDING`; it does not make the order paid. Confirmation is a separate permissioned operation that atomically changes the payment and appends `PAYMENT_RECEIVED`. Confirmed payments cannot be edited or deleted by the runtime role. Refunds are new child Payment rows plus `REFUND` events and are capped by the confirmed parent amount less earlier confirmed refunds. Pending payments may be voided; settled history is reversed/refunded rather than overwritten.

Order payment status is derived from confirmed events in the order currency:

- `UNPAID`
- `PARTIALLY_PAID`
- `PAID`
- `OVERPAID`

Confirmed events in other currencies are returned separately as unmatched currency totals. No FX rate is assumed.

Read-only reconciliation:

```powershell
npm run db:verify:erp-finance
```

## RBAC

| Capability | Owner/Admin | Manager | Member | Viewer |
| --- | --- | --- | --- | --- |
| Read ERP | yes | yes | yes | yes |
| Manage customers/products/warehouses | yes | yes | no | no |
| Create order | yes | yes | yes | no |
| Confirm/cancel/complete order | yes | yes | no | no |
| Receive/transfer inventory | yes | yes | no | no |
| Manual inventory adjustment | yes | no | no | no |
| Create fulfillment | yes | yes | yes | no |
| Record payment | yes | yes | yes | no |
| Confirm/refund payment | yes | yes | no | no |
| Link order document | yes | yes | yes | no |

The server enforces this matrix. UI visibility is convenience only.

## Owner AI and automations

Owner AI reads call authoritative tools for orders, products, customer orders, inventory, payment state, and overview. `createOrderFromQuote` is safe because the accepted QuoteVersion and exact-once database binding define its output. Order confirmation/cancellation, stock adjustments/transfers, fulfillment, payment confirmation, and refunds are risky. They require a persisted approved record matching the action; a client-provided or fabricated approval ID is rejected.

Automations route `createOrderFromAcceptedQuote` through the same service. `AutomationRun` claiming plus its unique tenant/automation/idempotency key and the order's accepted-version uniqueness make replay safe. No automation or Owner AI handler writes Prisma ERP rows directly.

## API and UI

The `/api/erp` surface provides tenant-scoped cursor pagination and bounded search for customers, products, orders, payments, inventory, and movements, plus explicit mutation routes for lifecycle operations. Mutation routes require same-origin JSON requests. Error responses distinguish validation (`422`), authorization (`403`), missing/cross-tenant resources (`404`), and state/revision/inventory conflicts (`409`). Responses are not cached across tenants.

The production ERP screen loads Overview, Orders, Products, Inventory, Payments, and Customers from these APIs and exposes loading, empty, error, permission, and conflict states. It does not seed or fall back to mock data.

## Database defense in depth

- Composite foreign keys include `orgId` for customer/order, quote-version/order, product/order-item, warehouse/product/balance, reservations, transfers, fulfillments, invoices, payments, and finance events.
- All Gate #6 tables have RLS enabled. Only the server runtime role has an explicit policy.
- `anon`, `authenticated`, and `PUBLIC` have no application-table privileges; public execution on guard functions is revoked.
- Membership triggers validate persisted actors against the same tenant.
- Runtime triggers protect order snapshots/revisions and immutable inventory, fulfillment, finance, and outbox history.
- Search/state/time indexes support tenant-first access paths and cursor pagination.

## Deployment and rollback

Migration source of truth:

```text
prisma/migrations/20260925150000_erp_production_domain/migration.sql
SHA-256 60e2f49b41827a9d8ab89361023c4807fe78428c7d1db9baf7f09bdfae3cf678
```

Before rollout, take and restore-test coordinated PostgreSQL/Storage backups, run the migration preflight, deploy the migration with the schema-owner direct/session URL, start the application with `haydev_runtime`, then run tenant, ERP HTTP/concurrency, Owner AI, automation, restart, and reconciliation checks. See `docs/database-backup-restore.md`.

Before accepting the Supabase PostgreSQL 15.19/17.11 minor upgrade announced on 2026-09-25, run:

```powershell
npx supabase db query --linked --file scripts/supabase-postgres-15-19-preflight.sql --output json
```

The check is read-only and detects affected `ltree` indexes, `btree_gist` float indexes, custom operators, and whether application `bytea` columns need a legacy `pgcrypto` data review.

This is a forward-only additive migration. Roll back the application only to a version compatible with the expanded schema. If a database rollback is unavoidable, stop all writers, restore the pre-migration database and matching Storage checkpoint into an isolated target, validate it, rotate runtime credentials, and only then route traffic. Do not manually delete ledger/history rows.

## Production configuration still required

Gate #6 does not remove the Gate #5 deployment prerequisites: provision the production server-only `DATABASE_URL` for `haydev_runtime`, exact HTTPS `APP_ORIGINS`, a compatible private Storage credential, and a real malware scanner before a live application cutover. No live application deployment is asserted by this document.
