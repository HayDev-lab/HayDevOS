# QuoteFlow production architecture

QuoteFlow is an authenticated, tenant-scoped PostgreSQL domain. The browser is a presentation client: it may submit product, quantity, discount, tax, customer, and validity inputs, but it cannot submit an organization, actor, status, revision result, approval result, or calculated total.

## Canonical write path

All HTTP, Owner AI, and automation mutations call `src/lib/quotes/service.ts`. That service applies role permissions, derives the active organization from the server session, validates tenant-owned relations, recomputes prices with `Prisma.Decimal`, performs the state transition, appends a quote event and audit record, and queues matching automations in the same transaction.

Authoritative calculation order is:

1. Round the catalog/manual unit price to two money decimals with `ROUND_HALF_UP`.
2. Multiply Decimal quantity and unit price.
3. Apply and persist the line discount.
4. Apply the quote-level discount and allocate its exact rounded amount over lines.
5. Calculate excluded tax or extract included tax.
6. Sum persisted line amounts. AMD, USD, and EUR remain separate; no implicit FX conversion exists.

Negative, non-finite, excessive, over-100-percent, and discount-over-base inputs are rejected. Product currency must match quote currency. `MANAGER`, `ADMIN`, or `OWNER` is required for a manual/free-form price and a reason is mandatory.

## Persistence and history

- `Quote` is the current working aggregate and carries an optimistic `revision`.
- `QuoteItem` stores the server result, not a client total.
- Every create or edit creates an immutable `QuoteVersion` containing customer, item, pricing, and quote snapshots.
- `QuoteApproval` references the exact version under review. An approval for an older version cannot authorize the current version.
- `QuoteEvent` is append-only for the runtime role.
- `GeneratedQuoteDocument` stores version-derived metadata, content hash, and reproducible snapshot. PDF/DOCX binary rendering and private Storage delivery remain a later DocumentFlow gate.
- `QuoteNumberCounter` allocates numbers atomically per tenant/year. Serializable conflicts are retried with a strict bound.

## State machine

```text
draft -> pending_approval -> approved -> sent -> accepted
                         \-> rejected -> revise -> draft
                                      sent -> declined -> revise -> draft
draft/rejected/declined/cancelled/expired -> archived
```

When approval is disabled in tenant settings, `draft` can move directly to `approved`. Financial content in `accepted`, `archived`, `cancelled`, `expired`, or `pending_approval` cannot be edited. Revising an approved, sent, rejected, or declined quote creates a new draft version; prior versions, decisions, sent snapshot, documents, and events remain historical evidence.

## API

All mutation routes require same-origin JSON and an authenticated tenant session.

- `GET/POST /api/quoteflow/quotes`
- `GET/PATCH/DELETE /api/quoteflow/quotes/:id`
- `POST /api/quoteflow/quotes/:id/{submit,approve,reject,send,accept,decline}`
- `GET /api/quoteflow/quotes/:id/versions`
- `POST /api/quoteflow/quotes/:id/document`
- `GET /api/quoteflow/overview`
- `GET/PATCH /api/quoteflow/settings`
- `GET/POST /api/quoteflow/products`
- `PATCH/DELETE /api/quoteflow/products/:id`

Search, status/currency/customer/owner filters, sorting, and pagination execute in PostgreSQL. Analytics group values by currency and never combine them through an invented rate.

## RBAC

- `VIEWER`: read.
- `MEMBER`: read, create, revise, submit.
- `MANAGER`: member capabilities plus approve/reject, send, client decision, archive, manual price override, and catalog management.
- `ADMIN`/`OWNER`: all QuoteFlow permissions, including settings.

Owner AI read tools query the same tenant services. Approved quote actions use the state machine; there is no direct Prisma status update. Quote automations use the same services, strict action schemas, a claimed `AutomationRun`, and tenant-scoped idempotency keys.

## Operations

Provision `QuoteSettings` when an organization is created. `scripts/bootstrap-admin.mjs` does this for the first organization. Apply migrations with the schema owner and run the application with `haydev_runtime`. The runtime role has application DML only, no migration-ledger access, no role/schema administration, and no RLS bypass. Browser Data API roles have no grants.

Use these focused checks:

```powershell
npm run test:quoteflow-pricing
npm run test:postgres-isolation
npm run test:quoteflow
npm run test:owner-ai-quoteflow
```
