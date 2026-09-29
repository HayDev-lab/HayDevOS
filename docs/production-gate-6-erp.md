# HAYDEVOS PRODUCTION GATE #6
## ERP / ORDERS / INVENTORY / OPERATIONS / FINANCE EVENTS REPORT

Status: **IMPLEMENTED AND DATABASE-ROLLED-OUT; LIVE APPLICATION CUTOVER REMAINS GATE #7**

Date: 2026-09-25  
Supabase project: `rljeqbffppqfxkwcptgs` (`HAYDEVOS`)  
Migration: `20260925150000_erp_production_domain`  
Migration SHA-256: `60e2f49b41827a9d8ab89361023c4807fe78428c7d1db9baf7f09bdfae3cf678`

## Executive summary

The production ERP route is no longer driven by browser mocks. UI, authenticated HTTP routes, Owner AI, and automations converge on one tenant-scoped service layer backed by PostgreSQL. Accepted QuoteVersion conversion is exact-once and snapshot-preserving; order numbering is race-safe; inventory is ledger-based and rejects negative/over-reserved stock; reservations, transfers, fulfillments, payments, refunds, audit, and outbox events are transactional. Operational money uses Decimal and never performs implicit FX.

No supplier/purchase-order or general-ledger subsystem was added because Gate #6 does not need one.

## Audit

The pre-change architecture, mock paths, canonical-model overlaps, risks, reusable code, required schema changes, and migration plan are recorded in `docs/erp-production-audit.md`. The active production entry point no longer imports `src/modules/erp/data.ts`; old mock components remain unreferenced so this gate does not destructively remove design history.

## Schema

Canonical entities extended: `Customer`, `Product`, `Order`, `Invoice`, `Payment`, and DocumentFlow's source binding.

Added entities: `OrderItem`, `OrderNumberCounter`, `OrderStatusEvent`, `Warehouse`, `InventoryBalance`, `InventoryMovement`, `InventoryReservation`, `InventoryTransfer`, `Fulfillment`, `FulfillmentItem`, `FinanceEvent`, and `ERPEvent`.

All tenant-sensitive relationships use composite tenant foreign keys. Checks cover entity types, lifecycle values, currencies, money/quantity bounds, balance non-negativity, reservation accounting, transfer conservation inputs, fulfillment quantities, and payment/refund parent semantics. Tenant-first state/time/search indexes and unique idempotency constraints back the API paths.

## Supabase rollout evidence

The linked target was verified before changes. Read-only preflight reported zero application rows in organizations, users, customers, products, quotes, quote versions, orders, invoices, payments, and documents; eight prior applied migrations; zero checked tenant orphans; and no elevated runtime role.

The exact committed Gate #6 SQL was then applied and its exact checksum was recorded in `_prisma_migrations`. Post-apply evidence:

- all Gate #6 business table counts remained zero;
- ledger/balance schema check: `1`;
- new ERP tables with RLS: `12`;
- browser-role ERP grants: `0`;
- essential composite tenant foreign keys: `9`;
- immutable/history triggers: `10`;
- essential ERP check constraints: `10`;
- public execution grants on ERP guard functions: `0`;
- DocumentFlow `ORDER` source enabled: `1`;
- runtime role remained non-superuser, no `CREATEDB`, no `CREATEROLE`, and no `BYPASSRLS`;
- `supabase db lint --linked --level warning`: no schema errors;
- Supabase security advisor: no issues;
- Supabase performance advisor: no issues;
- `supabase db push --linked --dry-run`: remote database up to date.

Gate-specific rollout helpers are `scripts/gate6-supabase-preflight.sql`, `scripts/gate6-record-migration.sql`, and `scripts/gate6-supabase-verify.sql`.

On 2026-09-25 Supabase announced the upcoming PostgreSQL 15.19/17.11 minor release. The new read-only `scripts/supabase-postgres-15-19-preflight.sql` was run against the linked project: current server `17.6`, zero `ltree` indexes, zero `btree_gist` float indexes, zero affected custom operators, and zero `bytea` columns in `public`. `pgcrypto` is platform-installed, but repository-wide inspection found no HayDevOS use of legacy `bf`/`blowfish`/`cast5` PGP encryption. No Gate #6 remediation is required before the upgrade on the current schema; rerun the preflight immediately before upgrading.

## Orders

Accepted quote conversion locks the quote, uses its accepted immutable version, copies financial/customer/item snapshots without recalculation, and creates the order plus events atomically. A unique accepted-version binding makes replay return exactly one order. A tenant/year counter allocates `ORD-YYYY-NNNNNN` without `count + 1`. Product/customer master changes cannot rewrite order snapshots.

The order lifecycle is server-owned. Mutations require an expected revision, enforce valid transitions, append status history, increment revision by exactly one, and return `409` on stale writes. Database triggers prevent runtime changes to protected snapshot/financial/source fields.

## Inventory

The authoritative history is `InventoryMovement`; `InventoryBalance` is an atomic projection. Receipts, adjustments, reservations/releases, issues, returns, and paired transfers update history and balances together. `onHand >= reserved >= 0` is a database invariant. Confirmation reserves stock, cancellation releases it, and fulfillment consumes it. Serializable retry, row locks, and deterministic lock order protect concurrent operations and avoid overselling.

`Product.stock` is retained only for compatibility with earlier code and is not read as the source of truth.

## Fulfillment

Partial and full fulfillments are append-only transactional operations. They reject excess quantities, consume only valid reservation quantities, create physical `ISSUE` movements, and advance the order to `PARTIALLY_FULFILLED` or `FULFILLED`. A completed fulfillment cannot be edited or deleted by the runtime role.

## Payments / Finance

Payments begin `PENDING`; confirmation creates an immutable `PAYMENT_RECEIVED` event. Pending entries can be voided. Settled value is changed only through child refund/reversal records and append-only finance events. Refund totals cannot exceed their parent payment. Order settlement is derived only from confirmed events in the order currency. Other currencies are reported separately; there is no implicit FX.

## QuoteFlow integration

Only an accepted QuoteVersion can become an order. The accepted version ID is persisted and unique. Quote financial totals, customer data, and items are copied as historical order snapshots and are not recalculated. Canonical product CRUD used by QuoteFlow delegates to the ERP catalog service.

## DocumentFlow integration

An authenticated tenant-scoped service can bind an otherwise unbound upload to `sourceType=ORDER` and the same-tenant order ID. Database source validation rejects cross-tenant bindings. DocumentFlow remains the sole owner of bytes, immutable versions, hashes, scans, and download authorization.

## Owner AI

Authoritative read tools cover order search/detail, inventory, products, customer orders, payment state, and ERP overview. Safe quote conversion and risky order/inventory/fulfillment/payment actions all use ERP services. Risky actions require a real persisted approved record matching the action; a caller cannot authorize itself by supplying an ID. Existing RBAC and durable Owner AI audit storage remain in force.

## Automations

`createOrderFromAcceptedQuote` runs through the ERP service. Automation run claiming, tenant-scoped replay keys, and accepted-version uniqueness prevent duplicate effects. Audit/outbox records are created transactionally with business changes.

## Transactions

- Quote conversion: quote advisory lock, atomic number counter, unique accepted-version guard.
- Inventory/reservation/transfer/fulfillment/payment: bounded SERIALIZABLE retry for `40001`/`40P01` only.
- Balance locks: deterministic warehouse/product order.
- Order writes: row/advisory lock plus optimistic revision.
- Audit and `ERPEvent`: same transaction as the authoritative mutation.

## Reconciliation

- `npm run db:verify:inventory` compares movement-derived stock/reservation totals to balance rows; latest tested result after two full concurrency runs: `balances=7`, `transfers=2`, `errors=0`, `readOnly=true`.
- `npm run db:verify:erp-finance` recomputes payment/refund currency totals and order settlement; tested result: zero errors, USD net `60.0000`, EUR retained as unmatched currency.
- Both scripts are read-only and fail closed on drift.

## Performance

Customer/product/order/payment/inventory reads use tenant-first indexes, bounded `limit`, cursor pagination, explicit filters, and targeted includes/aggregates. No unbounded ERP table scan is exposed by the HTTP API. Supabase performance advisor returned no issues after rollout.

## Tests

Completed on a clean migrated PostgreSQL database and a production Next.js build running as restricted `haydev_runtime`:

- TypeScript: `npx tsc --noEmit` passed.
- ESLint: `npm run lint` passed.
- Production build: `npm run build` passed.
- Dependency audit: `npm audit --audit-level=high` reported zero vulnerabilities.
- Current Next.js/React lint rules passed after making the ERP initial browser fetch asynchronous and cancellation-safe instead of synchronously invoking a stateful refresh from an effect.
- Existing unit/database suite: LeadOS SLA, QuoteFlow Decimal pricing, and PostgreSQL tenant isolation passed.
- ERP automation/Owner AI unit suite passed, including exact-once automation replay, permission matrix, safe/risky classification, and fabricated approval rejection.
- ERP HTTP/concurrency suite passed: login, overview, rejected non-accepted quote, canonical catalog, receipt, eight-way idempotent replay, sixteen concurrent order numbers, immutable snapshots, concurrent reservation race, cancellation release, partial/full/over-fulfillment, atomic transfer/failure, strict API validation, payment confirmation, no-FX currency split, refund, runtime immutability, revision race, order document binding, organization switch isolation, and logout.
- Owner AI authoritative ERP read passed.
- PostgreSQL defense tests passed: cross-tenant customer/inventory/document rejection; balance checks; immutable inventory/order/payment/finance/outbox/fulfillment history; triggers and browser-role grant boundary.
- Inventory and finance reconciliation passed with zero errors.
- Persistence was verified by reading the saved order after an application restart.
- Auth/tenant HTTP smoke and LeadOS HTTP regression passed. DocumentFlow's seven renderer/upload-validation tests passed. QuoteFlow core HTTP regression passed through tenant overview/settings, catalog, strict input rejection, create/search/pagination, concurrent numbering, revision conflicts, and version-bound approvals; its document-generation step returned the already documented `STORAGE_UNAVAILABLE` Gate #5 deployment blocker because the test runtime has no compatible production Storage credential.

## Files changed

- `prisma/schema.prisma`
- `src/lib/quotes/service.ts`
- `src/lib/documents/service.ts`
- `src/lib/automations/executor.ts`
- `src/lib/owner-ai/action-executor.ts`
- `src/app/api/owner-ai/{route,tools,prompt,offline}.ts`
- `src/modules/erp/{ErpCrmView,index}.tsx`
- `package.json`
- `README.md`
- `docs/production-security.md`
- `docs/database-backup-restore.md`
- `scripts/verify-migration-checksums.sql`

## Files added

- `prisma/migrations/20260925150000_erp_production_domain/migration.sql`
- `src/lib/erp/*`
- `src/app/api/erp/*`
- `src/modules/erp/api.ts`
- `scripts/verify-inventory-integrity.mjs`
- `scripts/verify-erp-finance.mjs`
- `scripts/gate6-supabase-{preflight,verify}.sql`
- `scripts/gate6-record-migration.sql`
- `scripts/supabase-postgres-15-19-preflight.sql`
- `tests/erp-production.mjs`
- `tests/erp-restart.mjs`
- `tests/erp-automation.test.ts`
- `tests/owner-ai-erp.mjs`
- ERP additions in `tests/postgres-tenant-isolation.mjs`
- `docs/erp-production-audit.md`
- `docs/erp-production.md`
- `docs/production-gate-6-erp.md`

## Migration

The migration is additive and forward-only. It performs preflight tenant-integrity checks before constraints, backfills compatible existing rows, installs tenant foreign keys/checks/indexes/RLS/policies/triggers, and revokes browser/public privileges. Prisma migrations remain the only schema source of truth.

## Definition of Done

- [x] Existing ERP audited before implementation.
- [x] Production ERP UI has no mock-data dependency.
- [x] Customer/Product canonical models reused.
- [x] Accepted QuoteVersion creates exactly one authoritative order without recalculation.
- [x] Tenant/year order numbering is atomic and unique.
- [x] Snapshot history is immutable and optimistic revision is enforced.
- [x] Inventory ledger, atomic balance, reservation, release, transfer, and fulfillment are implemented.
- [x] Negative/over-reserved inventory is rejected at application and database layers.
- [x] Decimal payments, immutable finance events, refunds/reversals, and no-FX reporting are implemented.
- [x] UI, Owner AI, and automations share the domain layer.
- [x] DocumentFlow order binding is tenant-safe.
- [x] RLS, composite tenant constraints, runtime triggers, and least privilege are active.
- [x] Strict API validation, same-origin mutation checks, pagination, search, indexes, and conflict handling are active.
- [x] Reconciliation scripts and concurrency/tenant/persistence tests pass.
- [x] Migration is applied and verified on the linked Supabase project.
- [ ] Gate #7 live deployment controls are provisioned and the public HTTPS deployment is validated.

## Known limitations

- No general ledger, double-entry accounting, taxes, payroll, bank reconciliation, supplier, or purchase-order workflow is claimed.
- Legacy `Product.stock` remains for compatibility and must not be used as inventory authority.
- Event dispatch/worker observability belongs to Gate #7; Gate #6 persists an outbox safely.
- This verification used an isolated local production build/database for stateful HTTP and concurrency tests. The linked Supabase rollout was verified at schema/security level without seeding production business data.

## Live deployment blockers

The application itself was not deployed live in this gate. Gate #7 must provide and validate the production `haydev_runtime` connection secret, exact HTTPS `APP_ORIGINS`, owner bootstrap/rotation, compatible private Storage server credential, real malware scanner, monitoring/structured logs/error tracking, backup/restore drill, health/readiness, rollback, and live cross-tenant/module suites.

## Rollback

Stop writers, preserve the failed state for forensics, and restore the coordinated pre-migration PostgreSQL and Storage checkpoint into an isolated target. Validate migrations, checksums, grants, tenant isolation, application smoke suites, and reconciliations before routing traffic. Never hand-delete or rewrite inventory, fulfillment, payment, finance, or event history. Application-only rollback is allowed only to a version compatible with the expanded schema.

## Next Gate

Gate #7 — Production Deployment & Operations: runtime secrets, HTTPS/origins, Storage key compatibility, malware scanning, monitoring, structured logs, error tracking, backup/restore exercise, rate limits, health/readiness, deployment rollback, and live LeadOS/QuoteFlow/DocumentFlow/ERP/Owner AI validation.
