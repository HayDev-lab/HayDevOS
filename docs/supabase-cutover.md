# Supabase cutover runbook

Target: `HAYDEVOS` / `rljeqbffppqfxkwcptgs` / Central EU (Frankfurt)

## Current state (2026-09-25)

The project is linked and the five committed migrations are already installed in the empty production target. Checksum verification is 5/5, runtime RLS/grants were tested through the session pooler, and Supabase advisors have no WARN/ERROR findings. Do not re-run the one-time baseline SQL on another project without first proving that project is the intended empty target.

The production target intentionally has no users or organizations. The remaining cutover work is to set the final runtime password, configure deployment secrets/origins, bootstrap the real first owner, deploy, and run HTTP smoke tests on the production URL.

## Required secrets

- Schema-owner session/direct URL for `DIRECT_URL` (session pooler port 5432 on IPv4 networks).
- A new password for the `haydev_runtime` role.
- Runtime pooler URL for `DATABASE_URL` (transaction port 6543 plus `pgbouncer=true` for serverless, or session pooling for a long-lived server).
- Exact production HTTPS origins for `APP_ORIGINS`.

Do not commit these values, print them, or put `DIRECT_URL` in the running application's environment.

## Preflight

1. Freeze application writes and keep `db/custom.db.before-supabase-20260925` unchanged.
2. Verify the CLI identity and project:

   ```powershell
   supabase projects list
   supabase link --project-ref rljeqbffppqfxkwcptgs
   ```

3. Use the schema-owner connection to prove the database identity and inspect existing objects. Stop if the target contains an unrelated schema or data.
4. Create and restore-test the backups described in `docs/database-backup-restore.md`.
5. In Supabase API settings, disable the Data API for `public` (preferred). If it must remain enabled for other schemas, confirm `anon` and `authenticated` have no application-table privileges.

## Schema and data

For future schema changes, run from a trusted migration runner, never from the browser or application startup:

```powershell
npm ci
npm run db:generate
npm run db:deploy
```

Enable the restricted runtime login with an interactively entered password:

```powershell
psql "$env:DIRECT_URL" -f scripts/enable-runtime-role.sql
```

If a later pre-cutover audit finds meaningful SQLite records, copy the immutable source into an otherwise empty application schema:

```powershell
$env:SQLITE_SOURCE_URL = "file:../db/custom.db.before-supabase-20260925"
npm run db:migrate:sqlite
npm run db:verify:sqlite
```

The copy command refuses to merge into populated target application tables. It preserves IDs, password hashes, session token digests, timestamps, and relationships, then compares a SHA-256 digest of every row without printing sensitive values.

For the audited 2026-09-25 source, skip this production copy: all identity, tenant, business, audit, session, and Owner AI tables were empty; the only row was a transient authentication-throttle test artifact. The local migration rehearsal nevertheless copied and digest-verified that row successfully.

## Deployment

1. Set only the restricted pooler URL as the server's `DATABASE_URL`.
2. Set `APP_ORIGINS`, bootstrap variables only if the target contains no owner, and the existing application secrets.
3. Keep `DIRECT_URL`, SQLite paths, database owner credentials, Supabase service-role keys, and bootstrap credentials out of the runtime environment.
4. Run `npm run auth:bootstrap` once only when required; immediately remove all `HAYDEV_BOOTSTRAP_*` values.
5. Deploy the application and keep old traffic stopped until verification passes.

## Verification

- `npm run db:check`
- `npm run test:postgres-isolation` against an isolated database with the same migrations
- `npm audit --omit=dev`, `npm run lint`, `npx tsc --noEmit`, `npm run build`
- unauthenticated requests return 401 and do not query tenant data;
- login creates a secure opaque session and logout revokes it;
- switching organization requires a real membership;
- user A cannot read, mutate, reference, approve, or reset organization B data;
- Owner AI conversation/message persistence survives restart;
- safe and approved risky actions create the intended domain and audit rows exactly once;
- duplicate webhook provider/event IDs are rejected per organization;
- removal of a membership revokes that organization's sessions;
- Supabase security and performance advisors show no unresolved finding introduced by this release.

## Traffic switch and rollback

Record final SQLite/PostgreSQL counts and digests, then enable traffic. Monitor authentication failures, PostgreSQL connection saturation, slow queries, constraint errors, and 5xx responses.

Rollback application traffic only to a PostgreSQL-compatible release. If data rollback is required, stop writers and restore the validated PostgreSQL backup/PITR point. Never switch a multi-instance production deployment back to writable SQLite.
