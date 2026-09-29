# HayDevOS SQLite to Supabase PostgreSQL migration audit

Audit date: 2026-09-25

Target Supabase project: `HAYDEVOS` (`rljeqbffppqfxkwcptgs`, Central EU / Frankfurt)

## Decision

HayDevOS must move from the packaged SQLite file to a server-only Prisma connection to Supabase PostgreSQL before production. The existing browser/API contracts, custom cookie-session authentication, membership-based RBAC, canonical `orgId` tenant boundary, Owner AI approval flow, and audit event semantics remain authoritative.

Supabase Auth is intentionally not introduced. The browser must not receive a database password, service-role key, or a general Supabase CRUD client. All writes continue through authenticated Next.js route handlers with server-side validation and authorization.

## Current persistence inventory

The source is `db/custom.db`, accessed by Prisma 6.19 through `DATABASE_URL=file:../db/custom.db`. The database contains the complete schema and one `AuthThrottle` row created by authentication/security verification. All other application tables are empty at audit time:

| Area | Tables | Rows at audit |
| --- | --- | ---: |
| Identity and tenancy | `User`, `Organization`, `Membership`, `Session` | 0 |
| Auth protection | `AuthThrottle` | 1 |
| Audit and notifications | `AuditLog`, `Notification` | 0 |
| Modules and business data | `ModuleRegistry` through `AuditQuestionnaire` | 0 |
| Owner AI | `AiConversation`, `AiMessage` | 0 |

No users, password hashes, active sessions, organizations, or Owner AI conversations are present. Even so, the migration path copies and verifies every table so the cutover procedure remains safe if data is added before execution.

The source has been preserved as a read-only, byte-for-byte backup at `db/custom.db.before-supabase-20260925`. It is intentionally not deleted or used as the writable production database.

## Schema findings and PostgreSQL mapping

- IDs are application-generated `String`/CUID values and remain `text`; no ID rewrite is permitted.
- `User.email` is globally unique because `User` is a global identity and tenant roles live in `Membership`. Organization-local duplicate users are therefore not part of the current product contract.
- `orgId` is the canonical tenant key. Tenant-owned tables retain explicit foreign keys to `Organization` and cascading behavior.
- Money is currently represented by SQLite `REAL`/Prisma `Float`. PostgreSQL changes monetary columns to `numeric(19,4)`/Prisma `Decimal`; quantities, stock, and confidence stay floating-point.
- All points in time change from SQLite `DATETIME` to PostgreSQL `timestamptz(3)`. Existing values are copied as JavaScript `Date` values and compared after migration.
- Existing JSON-shaped values are stored as strings and parsed by current application code. They remain `text` during this compatibility migration; a future JSONB migration must be versioned separately with API compatibility tests.
- Foreign-key and hot-path indexes are added where PostgreSQL cannot use the existing composite prefix: session organization, audit actor, lead owner/activity organization, task owner/lead, quote lead, document uploader, customer references, payment tenant/time, and AI user/time.
- No application raw SQL was found. Prisma is the runtime persistence layer.

## Runtime and migration connections

- `DATABASE_URL` is the server runtime URL. On serverless/short-lived deployment it should use Supabase transaction pooling (port 6543, with `pgbouncer=true`); on a long-lived server it may use the session pooler.
- `DIRECT_URL` is the schema migration and data-copy URL. It must use the Supabase session pooler (port 5432) on this IPv4-only workstation, or the direct IPv6 endpoint from a compatible network.
- Schema changes run with the migration owner. The application runs with the restricted `haydev_runtime` role after its password is set out of band.
- Prepared statements must remain disabled only for transaction pooling; the direct/session migration URL must not carry `pgbouncer=true`.

## Security boundary

1. Next.js resolves the opaque session cookie on the server and derives `userId`, active `orgId`, role, and permission set from PostgreSQL.
2. Every tenant mutation validates the request body and uses the server-derived organization, never a trusted client-supplied organization.
3. Membership/permission checks happen before action execution. Owner AI approved actions use the same executor and transaction boundary as direct actions.
4. The runtime database role receives only table DML and sequence usage; it receives no DDL, role administration, or schema ownership.
5. Supabase Data API access for `anon` and `authenticated` is revoked for application tables. Production should disable the Data API entirely because this application has no browser-to-database path.
6. RLS is not used as the primary authorization mechanism for the direct Prisma role. Adding database-enforced tenant context would require a transaction-scoped `SET LOCAL` on every query and is a separate architectural change; using an incomplete RLS policy would create false assurance. The current defense in depth is a private database surface, a least-privilege runtime role, foreign keys, and centralized server authorization.

## Files intentionally in scope

- `prisma/schema.prisma`, PostgreSQL migrations, and a read-only SQLite source schema
- package scripts and environment example required for generate/deploy/copy/verify
- a deterministic SQLite-to-PostgreSQL copy tool
- database connection setup in `src/lib/db.ts` only if pooling behavior requires it
- production database/storage, backup/restore, and cutover documentation
- deployment scripts that currently package or start SQLite
- tests directly asserting the old SQLite packaging behavior

## Files and contracts not to change in this migration

- Public route paths, request/response shapes, and status-code contracts
- Custom authentication/session cookie format and password hashes
- Membership role and permission semantics
- `orgId` tenant ownership and the Owner AI approval/action/audit workflow
- UI layouts, client state shape, navigation, and unrelated business-module behavior
- Existing source SQLite database contents or IDs

## Cutover gates

The migration is production-ready only when all of the following are evidenced against project `rljeqbffppqfxkwcptgs`:

- project link and database identity verified;
- PostgreSQL migrations applied with `DIRECT_URL`;
- Data API disabled or all application privileges revoked from exposed roles;
- `haydev_runtime` credentials configured only in the server environment;
- SQLite copy and count/digest verification pass;
- authentication, cross-tenant denial, permission/action, Owner AI persistence, typecheck, lint, build, and migration checks pass;
- Supabase security and performance advisors are reviewed;
- backup and rollback artifacts exist before traffic is switched.

At audit time the CLI account can list the target project, but the checkout is not linked and no PostgreSQL password/URLs are available locally. Therefore remote application and advisor verification is an external cutover gate, not assumed complete.

## Implementation outcome

The pre-migration blocker above was resolved through the authenticated Supabase CLI without exposing a database secret:

- the checkout is linked to `rljeqbffppqfxkwcptgs` and the remote identity was verified as PostgreSQL 17.6 database `postgres`;
- the remote `public` schema was confirmed empty before any write;
- five transactional Prisma migrations were applied and their exact SHA-256 checksums were recorded in `_prisma_migrations`;
- the resulting target has 29 public tables (28 application tables plus Prisma history), 28 server-only RLS policies, eight same-organization triggers, and seven membership triggers;
- `anon`/`authenticated` have zero application table grants and no application policies;
- `haydev_runtime` was verified through the Supabase session pooler with a temporary password, then returned to `NOLOGIN` and the temporary password was discarded;
- Supabase security/performance advisors report no WARN or ERROR findings after hardening the managed RLS hook;
- the source contained no user, organization, session, business, audit, or Owner AI records. Its single transient `AuthThrottle` test row was not promoted into the clean production target. The generic copy tool was separately proven locally with 28/28 table count/digest checks.

Remaining release inputs are intentionally external: choose the final `haydev_runtime` password, set the server-only pooler `DATABASE_URL`, bootstrap the first real owner/organization, configure the exact production `APP_ORIGINS`, and deploy the application. No production identity was invented during migration.
