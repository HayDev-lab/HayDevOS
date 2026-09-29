# Database backup and restore

## Scope

This runbook covers HayDevOS application tables, Prisma migration history, custom trigger functions, and the `haydev_runtime` role definition. Document bytes require the coordinated procedure in `docs/storage-backup-restore.md`; a database-only restore is incomplete once `DocumentVersion` rows exist. Deployment secrets and the runtime role password require separate recovery procedures.

The preserved pre-cutover SQLite source is `db/custom.db.before-supabase-20260925`. Keep it read-only and outside deployment artifacts.

## Before every migration

1. Confirm the project ref is `rljeqbffppqfxkwcptgs` and record the deployment commit.
2. Stop writes or enable maintenance mode for a data cutover.
3. Confirm `DIRECT_URL` is a session/direct PostgreSQL connection, not transaction pooling.
4. Create a Supabase platform backup/PITR checkpoint when the plan supports it.
5. Create a logical dump from a trusted runner with current PostgreSQL client tools:

   ```powershell
   pg_dump --dbname "$env:DIRECT_URL" --format=custom --no-owner --no-acl --file "haydevos-pre-cutover.dump"
   ```

   Prefer a protected `PGPASSFILE` or CI secret injection so credentials do not appear in logs or shell history. Encrypt the resulting dump at rest.
6. Capture migration status and non-sensitive table counts:

   ```powershell
   npm run db:check
   psql "$env:DIRECT_URL" -v ON_ERROR_STOP=1 -c 'select migration_name, finished_at from "_prisma_migrations" order by finished_at;'
   ```

7. Restore-test the dump to an isolated database before relying on it.
8. For any system with document versions, capture the matching private-bucket export/manifest and require zero hash reconciliation drift at the same cutoff.
9. Once ERP data exists, require clean read-only baselines before the migration:

   ```powershell
   npm run db:verify:inventory
   npm run db:verify:erp-finance
   ```

   Record balance/movement, reservation, transfer, order, payment, refund, and currency-group totals with the backup evidence.

## Restore rehearsal

Use a new, isolated PostgreSQL database. Never rehearse against the production project.

```powershell
createdb haydev_restore_test
pg_restore --dbname "postgresql://.../haydev_restore_test" --clean --if-exists --no-owner --no-acl "haydevos-pre-cutover.dump"
```

Then:

1. Point `DIRECT_URL` and `DATABASE_URL` at the isolated database.
2. Run `npm run db:deploy`; committed migrations must be idempotently reported as applied.
3. Run `npm run test:postgres-isolation`.
4. If validating a SQLite cutover, run `npm run db:verify:sqlite` against the restored target.
5. Run typecheck, lint, build, authentication, tenant-denial, Owner AI persistence, and approval/action smoke tests.
6. Run `npm run db:verify:inventory` and `npm run db:verify:erp-finance`; both must report zero errors. Exercise a saved order read across an application restart.
7. Destroy only the isolated rehearsal database after recording evidence.

## Production restore

1. Declare maintenance mode and stop all application writers.
2. Identify the exact recovery point and preserve a fresh dump of the failed state for forensics.
3. Prefer Supabase PITR when a precise recovery point is available. For a logical restore, restore into a new database/project first and validate there.
4. Apply committed migrations with the schema-owner `DIRECT_URL`.
5. The dump does not safely manage login passwords. Run `scripts/enable-runtime-role.sql` interactively to set a new runtime password, then rotate the deployment `DATABASE_URL`.
6. Verify table counts, critical IDs, newest audit/session timestamps, foreign keys, trigger functions, and runtime grants.
7. Run the full production smoke suite before routing traffic.
8. Restore the matching document bucket and require zero missing/hash/orphan findings before routing traffic.
9. Require zero inventory/finance reconciliation errors. Compare tenant/currency totals and critical order/payment/fulfillment IDs with the pre-restore manifest; never repair drift by directly editing historical rows.
10. Keep the previous database, bucket export, and SQLite backup immutable until the rollback window closes.

## Rollback rule

Application rollback is safe only when the old application understands the current database schema. Forward-only migrations that remove or reinterpret fields require a compatible dual-read/dual-write release first. Never restore the old SQLite file into a running multi-instance deployment.
