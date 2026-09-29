# Storage architecture

## Authoritative stores

| Data | System of record | Access path | Tenant boundary |
| --- | --- | --- | --- |
| Users, password hashes, memberships, sessions | Supabase PostgreSQL | Server-side Prisma only | Membership plus server-derived `orgId` |
| Business modules and audit trail | Supabase PostgreSQL | Authenticated Next.js route handlers | Required `orgId` on every tenant-owned row |
| Owner AI conversations, messages, approvals and action audit | Supabase PostgreSQL | Owner AI server services | Session user plus active membership |
| Document metadata, immutable versions, hashes, scan/generation/access history | Supabase PostgreSQL | Authenticated Next.js DocumentService | Server-derived `orgId`, composite FKs, triggers, RBAC |
| Uploaded/generated document bytes | Private Supabase Storage bucket `haydev-documents` | Server-only Storage adapter and short-lived signed download | Server-generated `organizations/{orgId}/documents/...` key |
| Deployment and integration secrets | Deployment secret manager | Server process only | Environment/deployment scope |

SQLite is a migration source and rollback artifact only. It is not copied into a production build and cannot be selected by the production start script.

## Database access

The browser talks only to Next.js. Next.js uses Prisma and the restricted `haydev_runtime` PostgreSQL role. `DATABASE_URL` is the runtime pooler connection; `DIRECT_URL` belongs only to migration/cutover jobs and uses the schema owner.

The runtime role can read and modify application tables, but cannot create schema objects, administer roles, bypass RLS, or read Prisma's migration history. Supabase RLS stays enabled with one `FOR ALL` policy granted only to `haydev_runtime`; browser roles receive no policy. Database triggers reject cross-organization relationships and reject tenant user references without membership. These controls supplement, rather than replace, route-level authentication, permission checks, Zod validation, and transaction boundaries.

Supabase Data API is not an application dependency. The `anon` and `authenticated` roles are stripped of application table and sequence privileges by migration. Disable the Data API for `public` in the project settings as the preferred production configuration.

## Data model decisions

- IDs remain application-generated CUID/text values so foreign keys and external references survive cutover.
- Monetary values use `numeric(19,4)`; quantities, stock, and confidence remain double precision.
- Times use `timestamptz(3)` and are serialized through the existing ISO/JavaScript `Date` contract.
- JSON-shaped strings remain text during this compatibility migration. Converting them to JSONB requires a separate versioned migration and API regression tests.
- User email is globally and case-insensitively unique. Tenant roles belong to `Membership`, not `User`.
- Webhook identity is unique per organization/provider/event for idempotent delivery.

## File storage implementation

DocumentFlow uses one private bucket with a 25 MB limit and MIME allowlist. The browser uploads one multipart file to HayDevOS; it never receives an upload key or privileged Supabase credential. The server validates the payload and generates an immutable key:

`organizations/{orgId}/documents/{documentId}/versions/{versionId}/{sanitizedFilename}`

`DocumentVersion` records detected MIME, byte size, SHA-256, creator, template/locale, source snapshot, scan state, and failure state. Upload/generation prepares pending metadata, writes with `upsert: false`, reads the object back to verify size/hash, and finalizes the version. Failures use compensating deletion and durable failed metadata/audit.

User uploads stay `PENDING_SCAN`; only the trusted scanner hook can move them to `CLEAN`/`ACTIVE`, `INFECTED`/`REJECTED`, or `SCAN_FAILED`/`FAILED`. Generated artifacts are trusted server output and use `NOT_REQUIRED`.

Downloads always enter through HayDevOS, re-resolve the session/tenant/permission and released version, append access audit, then issue a 30–300 second signed URL. Public object URLs and browser Storage policies are not used.

The database and bucket are backed up as one recovery set. `scripts/verify-document-storage.mjs` compares both directions and optionally hashes every object; it is report-only. Detailed lifecycle and recovery procedures are in `docs/documentflow-production.md` and `docs/storage-backup-restore.md`.

## Realtime and caches

Realtime is intentionally disabled for the first production cutover. If added, subscriptions must be server-authorized and tenant-filtered; enabling a public table in a realtime publication is not an authorization mechanism.

There is no authoritative external cache. In-process/client caches are disposable and must be invalidated after mutations. Login throttles, sessions, action state, and audit records stay in PostgreSQL so they work across instances.
