# Production security runbook

HayDevOS uses custom database-backed opaque sessions. The browser receives only a random `HttpOnly`, `Secure`, `SameSite=Strict` cookie; PostgreSQL stores its SHA-256 digest. Every protected request resolves the user, active organization, current membership, role, and permission set at the server boundary.

## Required deployment controls

1. Terminate TLS before Next.js and configure exact HTTPS values in `APP_ORIGINS`.
2. Use Supabase PostgreSQL through the server-only `DATABASE_URL`. Never expose database URLs, owner credentials, or a Supabase service-role key to browser code.
3. Apply committed migrations with the schema-owner `DIRECT_URL` from a trusted migration runner. Do not run `db push` or migrations during application startup.
4. Run the application as `haydev_runtime`; the role has DML only and cannot create schema objects, administer roles, bypass RLS, or inspect Prisma migration history.
5. Disable the Supabase Data API for `public`. The migrations also revoke application-table privileges from `anon` and `authenticated` as defense in depth.
6. For a fresh system only, set `HAYDEV_BOOTSTRAP_*`, run `npm run auth:bootstrap` once, and immediately remove the bootstrap variables.
7. Keep `DIRECT_URL` and SQLite paths out of the runtime environment. The production launcher rejects SQLite.

## Authentication and authorization invariants

- Authentication identity comes only from the server-resolved session cookie.
- The active organization must be a current `Membership`; a client-supplied `orgId`, user ID, role, or permission is never authoritative.
- Unsafe methods require an allowed origin and a valid JSON/content contract before action execution.
- Every tenant query and mutation includes the server-derived organization boundary.
- PostgreSQL triggers additionally reject cross-organization entity references and tenant user references without membership.
- Removing a membership revokes sessions scoped to that organization.
- `OWNER`/`ADMIN` is required for Owner AI approvals and tenant-wide audit reset.
- Risky actions require persisted approval; retries must not duplicate side effects or audit records.
- Password hashes and session token digests are copied without transformation during cutover and are never logged.

## Operational controls

- Back up and restore-test PostgreSQL before every migration; follow `docs/database-backup-restore.md`.
- Keep Next.js, React, Prisma, and transitive dependencies patched. CI runs audit, lint, typecheck, build, migration deploy on an empty PostgreSQL database, and tenant-isolation tests.
- Cap pool size per instance and monitor total Supabase connections. Transaction pooling requires `pgbouncer=true`; migration/session URLs must not use it.
- Forward client IP/origin headers only from trusted proxies. Login throttling combines the normalized email and trusted client address.
- Rotate the runtime password and revoke database sessions after any suspected leak.
- Alert on repeated authentication failures, cross-tenant constraint violations, approval failures, PostgreSQL saturation, slow queries, and 5xx responses.

## LeadOS production controls

- LeadOS uses only server-side authenticated routes and the canonical domain services documented in `docs/leados-production.md`.
- Strict request schemas reject client-supplied tenant, actor, role, or audit fields.
- Reads, search, filters, pagination, exports, and writes are scoped with the active organization from the persisted session.
- Contact/external deduplication is tenant-aware. Webhook and automation replay keys include the tenant.
- Lead activities are append-only for `haydev_runtime`; lead deletion is a soft archive.
- Composite foreign keys enforce tenant-compatible stage, note, activity, and task references.
- Owner AI persistent reads and lead actions use the same service/RBAC path. Its fallback uses authenticated PostgreSQL data, never production mock data.
- Approved automation lead actions use the same domain services; action configuration is strictly validated before execution.

Other visual business modules may still contain demonstration datasets and are not authoritative until their own production gates pass. `HAYDEV_ALLOW_DEMO_DATA=true` remains development-only and is ignored in production LeadOS paths.

## QuoteFlow production controls

- QuoteFlow accepts business inputs only; tenant, actor, state, calculated amount, version, approval, and audit fields are server-owned.
- All financial calculations use the Decimal server engine. Client preview numbers are never persisted as authority.
- Products, customers, leads, owners, items, versions, approvals, events, and documents have tenant-compatible database references.
- Quote numbers are allocated atomically. Writes require the current revision, and bounded transaction retry handles only PostgreSQL serialization conflicts.
- Versions, events, accepted version bindings, and generated document snapshots are historical evidence. Runtime triggers prohibit destructive changes.
- Approvals authorize one immutable version. Editing creates a new version and invalidates the old decision for sending/acceptance.
- Owner AI and automations call canonical QuoteFlow services. High-impact Owner AI actions keep the existing persisted approval requirement.
- Currency analytics stay separated; the application never invents an FX rate.

## DocumentFlow production controls

- Document bytes live only in the private `haydev-documents` bucket; metadata, immutable hashes, versions, scan state, access events, and quote bindings live in PostgreSQL.
- Storage credentials are server-only. The client cannot choose an organization, bucket, key, hash, scan result, artifact state, actor, template, or calculated quote value.
- Uploads are limited to one file/25 MB and validated by extension, MIME, signature/OOXML structure, and safe filename rules. Storage also enforces the size/MIME boundary.
- Immutable keys use server-derived tenant/document/version IDs and `upsert: false`; successful writes are read back and verified by size/SHA-256.
- User uploads remain quarantined and non-downloadable until a real scanner calls the trusted hash-bound result hook. No scanner means `PENDING_SCAN`, never fake clean.
- Downloads require session, current membership, tenant match, RBAC, document/version relationship, and released scan/status before a short-lived signed redirect is created.
- PDF/DOCX generation consumes immutable QuoteVersion snapshots through DocumentService. Owner AI uses the same service and cannot access Storage directly.
- Reconciliation is read-only and reports missing, mismatched, and orphan objects. Backups/restores must coordinate PostgreSQL metadata with Storage bytes.

## ERP production controls

- ERP business input is accepted only through authenticated, tenant-resolved, same-origin server routes with strict schemas. Tenant, actor, role, lifecycle, revision, balance, status, and audit/event fields are server-owned.
- Accepted QuoteVersion conversion is exact-once and copies immutable customer, item, and financial snapshots without recalculation. Tenant/year order numbers are allocated atomically.
- InventoryMovement is the stock history authority. Balance updates, reservations/releases, transfers, and fulfillment issues commit atomically under deterministic locks and bounded serialization retry; database checks reject negative or over-reserved stock.
- Order transitions require an expected revision. Runtime triggers protect order snapshots and make inventory movements, transfers, fulfillments, finance events, and confirmed payments non-destructive.
- Payments are pending until separately confirmed. Refunds/reversals append records and events; currency totals remain separate and no FX conversion is inferred.
- Owner AI and automations use the same ERP services and RBAC as the UI. Risky Owner AI mutations require a persisted approval matching the action.
- Composite tenant foreign keys, membership triggers, RLS, runtime-only policies, and revoked `anon`/`authenticated`/`PUBLIC` grants provide database defense in depth.
- Run the read-only inventory and finance reconciliation commands before and after migrations, restores, and releases.
