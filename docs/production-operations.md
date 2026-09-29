# Production operations runbook

## Routine cadence

Every 1 minute, monitor `/api/health`; every 5 minutes, monitor `/api/ready` from outside the hosting network. Alert after two consecutive readiness failures and immediately on cross-tenant, malware, Storage-publicity, or secret-leak events.

Daily:

- Review structured 5xx, authentication throttling, origin rejections, scanner failures, database pool pressure and backup completion.
- Run read-only document, inventory and finance reconciliation. Automated jobs detect/report only; they must not repair financial or stock data automatically.
- Review quarantined `PENDING_SCAN`, `SCAN_FAILED`, and `REJECTED` uploads. Never mark them CLEAN manually.

Weekly:

- Verify an encrypted backup manifest and sample object/database hashes.
- Review Supabase Security and Performance Advisors, long-running queries, locks, index usage and connection counts.
- Remove expired sessions/rate-limit rows using an approved maintenance job and audit the count.

Monthly and before risky releases:

- Perform an isolated database plus Storage restore drill.
- Test rollback, secret rotation contacts, incident paging and external smoke coverage.
- Review OWNER/admin membership and inactive accounts.

## Service triage

1. Check public `/api/health` and `/api/ready`; capture timestamp, release ID and request ID.
2. Correlate the request ID in JSON logs. Do not copy cookies, authorization headers or bodies into an incident channel.
3. Determine whether the failure is configuration, database, Storage, scanner, Owner AI, or application code.
4. If tenant isolation, credential exposure, public file access or malware false-clean is suspected, contain first and follow the incident runbook.

### Database

Verify Supabase status, session-pooler availability, connection count and runtime role. Do not switch the web service to the migration owner. Do not increase pool size before checking aggregate concurrency. For schema failures, stop traffic shift and prefer application rollback only when the prior version is compatible with the migrated schema.

### Storage

Verify bucket remains private, MIME/size policy, modern key authentication and signed URL TTL. Run reconciliation in report mode. Never delete orphan objects automatically; inspect ownership and backup evidence first.

### Malware scanner

Provider outage must leave uploads quarantined and non-downloadable. Alert, pause uploads if backlog grows, and retry only through a bounded audited job. Never override a verdict. Confirm EICAR behavior after provider/configuration changes.

### Owner AI

Owner AI provider failure does not take down core modules. Confirm the route returns a controlled error, no offline/synthetic production answer is emitted, and no proposed action executes without the established approval flow.

## Backup and restore

Run backups only to an access-controlled encrypted destination outside the repository:

```bash
BACKUP_DIR=/encrypted/haydevos-backups \
BACKUP_DESTINATION_CONFIRMED_ENCRYPTED=YES \
npm run backup:production
```

The job is successful only when `pg_dump`, every private Storage download, and `manifest.json` creation finish. Alert on any non-zero exit. Replicate the encrypted artifact to a second failure domain according to business retention policy.

For a restore drill, provision a disposable database whose name includes `restore` or `drill` and a private isolated bucket with the same marker. Then run:

```bash
BACKUP_MANIFEST=/encrypted/.../manifest.json \
RESTORE_DATABASE_URL='stored-securely' \
RESTORE_CONFIRM_ISOLATED=HAYDEVOS_RESTORE_DRILL \
HAYDEV_RESTORE_BUCKET=haydevos-restore-drill \
npm run restore:drill
```

The script checks the dump hash, refuses a target matching a live URL, restores with `--exit-on-error`, validates core table access, uploads every Storage object into an isolated prefix, verifies SHA-256 and removes drill objects. Record duration, object count, database count summary and final hash. Destroy the isolated target through the provider after evidence is retained.

## Graceful deployment

Use the service manager's SIGTERM stop with an adequate drain timeout. Remove the old instance from traffic, wait for active requests, stop Node, deploy the immutable release, start Node, wait for readiness, then re-add traffic. Caddy may remain running. Never run multiple migration jobs concurrently.
