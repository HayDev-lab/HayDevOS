# Production deployment runbook

Target architecture: immutable Next.js standalone artifact on Node 24 behind Caddy on a managed VPS/VM. Caddy owns public ports 80/443, obtains TLS for `HAYDEV_DOMAIN`, and proxies only to `127.0.0.1:3000`. PostgreSQL and private object storage remain in the linked Supabase project.

## 1. Prerequisites

1. Provision a non-root application account, firewall allowing only SSH from the administration network and public 80/443, encrypted disk, time sync, Node 24.18.0, Caddy, PostgreSQL 17 client tools, and a service manager.
2. Point the final DNS A/AAAA record to the host and verify ownership. Do not set `APP_ORIGINS` to a temporary wildcard.
3. Configure an encrypted secret store readable only by the service account. Enter values from `docs/production-environment.md` there; never put them in the repository.
4. Create an external JSON-log destination and availability/error alerts.
5. Create a dedicated `HAYDEVOS_PRODUCTION_SMOKE` organization identity distinct from the real OWNER organization.

## 2. Preflight and build

From a clean checkout of the intended commit:

```bash
npm ci
npm run db:generate
npm run lint
npm run typecheck
npm run test:malware
npm run test:sla
npm run test:quoteflow-pricing
npm run test:documentflow
npm run security:audit
npm run build
test -f .next/standalone/server.js
```

Copy only the standalone output, static assets, public assets, Caddyfile and release metadata to a new immutable release directory. Do not copy `.env`, `db/`, `upload/`, `.git/`, test output or local logs.

## 3. Backup and migration

1. Complete an encrypted pre-deploy backup and record its manifest SHA-256.
2. Acquire the deployment/migration lock. Exactly one job receives `DIRECT_URL`.
3. Run `npm run db:deploy` from the release source with the migration credential.
4. Run the read-only `scripts/production-database-audit.sql`; require all migrations applied, zero incomplete, correct runtime role properties and the expected RLS count.
5. Remove `DIRECT_URL` from the runtime environment if the platform separates job and service scopes.

Never run `prisma migrate reset`, SQLite migration, destructive test cleanup, or development seed commands against production.

## 4. Storage and scanner gate

Before traffic:

```bash
npm run storage:configure
npm run storage:smoke
npm run storage:reconcile -- --hash
```

Prefer the modern `sb_secret_` key without `SUPABASE_STORAGE_AUTH_JWT`. Require private bucket metadata, authenticated list, upload, signed download, anonymous denial, SHA-256 round trip and cleanup. If the hosted Storage service returns `Invalid Compact JWS`, stop and escalate unless the owner explicitly accepts the documented temporary compatibility mode. That mode keeps the modern key in `apikey`, supplies the legacy compact JWT only as the server-side Storage `Authorization` header, emits a startup warning, and remains a tracked rotation item.

Validate MetaDefender account health, data-retention/sample-sharing settings and bounded timeout. A scanner outage is a release blocker for user uploads.

## 5. Start and health

Install the secrets, set `NODE_ENV=production`, start `node server.js` under the service manager, and start Caddy with the repository Caddyfile. The application must bind internally only; Caddy is the public edge.

Check locally, then externally:

```bash
curl --fail --silent http://127.0.0.1:3000/api/health
curl --fail --silent https://$HAYDEV_DOMAIN/api/health
curl --fail --silent https://$HAYDEV_DOMAIN/api/ready
```

`health` proves only process liveness. Do not shift traffic until `ready` is 200 and database, Storage, scanner and configuration are true. Owner AI is reported separately because it is optional to core availability.

## 6. OWNER bootstrap

Inject `HAYDEV_BOOTSTRAP_*` only into a protected one-off job and run:

```bash
npm run auth:bootstrap
```

Verify the intended email, organization and OWNER membership using a read-only query. Immediately delete all bootstrap values, restart/redeploy, and rerun the command only as an idempotency test: it must report no changes. A conflict must abort.

## 7. Live acceptance and traffic shift

Run from an external trusted workstation:

```bash
BASE_URL=https://$HAYDEV_DOMAIN \
PRODUCTION_SMOKE_EMAIL='in-secret-store' \
PRODUCTION_SMOKE_PASSWORD='in-secret-store' \
PRODUCTION_SMOKE_ORG_SLUG='haydevos-production-smoke' \
npm run production:smoke
```

Set `PRODUCTION_SMOKE_ALLOW_UPLOADS=1` only for the dedicated tenant to execute CLEAN/EICAR checks; set `PRODUCTION_SMOKE_ALLOW_AI=1` only after spend and action safety are approved. Supply a foreign-tenant lead ID created solely for the isolation probe. Archive smoke artifacts after validation.

Complete the remaining binary checklist, enable traffic gradually, and watch readiness, 5xx, authentication rejection, database pool, scanner and latency dashboards.

## 8. Abort conditions

Abort or roll back for migration failure, readiness 503, origin/cookie failure, secret leakage, cross-tenant access, anonymous Storage access, an unapproved legacy Storage dependency, scanner false-clean/unavailable behavior, reconciliation errors, or sustained error/latency regression. Follow `docs/production-rollback.md`.
