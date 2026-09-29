# QuoteFlow production audit

Date: 2026-09-25

## Current architecture

QuoteFlow is a client-only module under `src/modules/quoteflow`. Its tabs render static arrays from `src/modules/quoteflow/data.ts` and `src/lib/mock`; there is no QuoteFlow HTTP API or canonical server domain layer. Browser state and toast notifications currently stand in for persistence.

## Current UI

The existing UI contains Requests, Quotes, Builder, Catalog, Approvals, Analytics, and Settings tabs. The layout and interaction model are reusable. Loading, authoritative error, tenant switch, optimistic-concurrency, version selection, and persisted approval states are absent.

## Synthetic data sources

- `src/lib/mock/quotes.ts`, `products.ts`, `customers.ts`, and `leads.ts`
- `src/modules/quoteflow/data.ts`: pricing rules, price books, templates, approvals, generated documents, share links, activity, and requests
- `QuoteFlowView`, `QuotesView`, `QuoteBuilder`, `QuoteDetail`, `ApprovalsView`, `AnalyticsView`, Catalog components, Requests, Templates, and Settings import or derive from those arrays
- create/update/approve/send/accept/reject/archive/document controls currently mutate local state or only display a toast

No browser storage is used, but React state is acting as the temporary source of truth.

## Current quote calculations

`src/modules/quoteflow/pricing.ts` is a useful pure preview engine, but it uses JavaScript `number`, clamps invalid inputs instead of rejecting them, rounds with `Math.round`, and runs only in the client module. The server does not recompute totals and currently accepts no quote writes at all.

## Existing Prisma models

Reusable models already exist: `Quote`, `QuoteItem`, `Product`, `PriceBook`, `Customer`, `Lead`, `AuditLog`, `Automation`, `AutomationRun`, and `DocumentRecord`. `Quote` and `QuoteItem` have PostgreSQL numeric money columns, but the current schema lacks immutable snapshots, version-bound approvals, events, document metadata, race-safe numbering, ownership fields, optimistic concurrency, complete tenant composite keys, and quantity as Decimal.

## Existing customer models

The ERP `Customer` model is tenant-owned and should be reused. It currently has name/email/phone/type only. Quote creation must validate the customer in the active tenant and copy a customer snapshot into each `QuoteVersion`.

## LeadOS integrations

`Quote.leadId` already exists and a database trigger checks same-organization ownership. The UI currently selects synthetic leads. Production QuoteFlow must query tenant LeadOS records and preserve the composite tenant invariant.

## Existing document generator

There is no real QuoteFlow PDF/DOCX generator. The current generated-document list and download buttons are synthetic. Gate #4 can persist metadata and a reproducible snapshot/hash; binary rendering and private Supabase Storage remain the DocumentFlow gate.

## Existing Owner AI support

Owner AI quote read tools use `mockQuotes`. Approved `markQuoteWon`/`markQuoteLost` actions directly update Prisma status, bypassing a quote state machine, version binding, and quote audit. The existing persistent Owner AI approval/audit infrastructure is reusable.

## Approval state

Approvals are browser-only mock rows. There is no database approval tied to a specific immutable version, no membership constraint for approvers, and no server transition guard.

## Versioning state

`Quote.version` and `parentId` are mutable fields, not immutable snapshots. Historical customer/product values and totals cannot be reconstructed. Documents would therefore change when mutable records change.

## Security risks

- No authenticated QuoteFlow API, mutation origin validation, strict payload validation, or safe DTO boundary.
- Owner AI writes Quote directly.
- Client-calculated money would be authoritative if persistence were added to the current builder.
- Approval, send, accept, reject, and archive controls have no server enforcement.

## Tenant risks

- Quote reads are currently global mock arrays.
- Existing `QuoteItem` has no `orgId`; customer/product/owner references lack composite tenant constraints.
- Browser tab switches do not remount a tenant-keyed QuoteFlow cache.

## Financial calculation risks

- Binary floating-point and `Math.round` are unsuitable as the authoritative money path.
- Invalid negatives/overflow/NaN are clamped rather than rejected.
- Taxes, quote discounts, and line discounts are not persisted as a reproducible server snapshot.
- Multiple currencies can be combined by client analytics.

## Reusable code

- Existing QuoteFlow visual shell and form structure
- Prisma `Quote`, `QuoteItem`, `Product`, `PriceBook`, `Customer`, `Lead`, `AuditLog`, `Automation`, and `AutomationRun`
- HayDevOS session-derived tenant context, RBAC types, origin guard, normalized API errors, Zod request helper, database audit conventions, and Owner AI approval store
- Preview-only pricing UI concepts, after replacing authoritative arithmetic with a Decimal server engine

## Missing production components

- `src/lib/quotes` canonical domain/repository/pricing/versioning/approval/event layer
- Immutable `QuoteVersion`, version-bound `QuoteApproval`, append-only `QuoteEvent`, settings/counter/document metadata
- Race-safe database numbering and optimistic-concurrency checks
- Authenticated APIs, persistent UI provider, production Owner AI adapters/executor, automation adapter
- Quote calculation, cross-tenant, snapshot, immutability, concurrency, restart, and org-switch tests

## Migration plan

1. Extend the existing models and add only missing QuoteFlow records.
2. Backfill existing quotes into version snapshots without generating production fixtures.
3. Add composite tenant foreign keys, membership triggers, immutable-history triggers, RLS, restricted grants, and indexes.
4. Implement one Decimal pricing engine and canonical domain services.
5. Expose strict authenticated Route Handlers and safe DTOs.
6. Rewire the existing UI, Owner AI, and automations to the domain layer; remove all production mock imports.
7. Verify locally against PostgreSQL 17, then apply the exact committed migration to linked Supabase and verify ledger, drift, advisors, grants, and an empty production dataset.
