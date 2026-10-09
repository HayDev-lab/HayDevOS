# HAYDEVOS PRODUCTION GATE #7
## Production deployment and operations report

Evidence date: 2026-09-27

**Verdict: BLOCKED**

**Code/operations readiness: PASS**  
**Deployment readiness: PARTIAL**  
**Live production verification: PARTIAL PASS**

Gate #7 is not PASS. `haydevos.com` is healthy on Vercel and the safe authenticated production smoke passes, but the final OVH cutover, destructive business suites, backup/restore evidence and monitoring remain unresolved.

## Production URL

- Domain: `haydevos.com` registered at Namecheap; apex uses both current Vercel A records and `www` uses the dedicated Vercel CNAME
- HTTPS: active for `haydevos.com` and `www.haydevos.com`; root, health and readiness return HTTP 200 with HSTS and CSP
- Hosting: OVHcloud VPS-2 ordered with Ubuntu 24.04 and automated backup; OVH order validation is still in progress
- Interim production: `https://haydevos.com`, Vercel deployment `dpl_EZdrdjCyW8ZQjTximB5QNEizahqT`, status `READY`
- Release: current working tree deployed to the linked Vercel production project; final OVH release remains pending

## Database

- Project: `rljeqbffppqfxkwcptgs`
- Engine: PostgreSQL 17.6, SSL on
- Runtime role: `haydev_runtime`; `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE`, login enabled
- Migrations: 9 applied, 0 failed/incomplete
- Tenant RLS: enabled on 49/49 tables containing `orgId`
- Production identities: 1 organization, 5 users and 5 memberships; business-record counts were not re-audited in this run
- Runtime connection: the ignored local `.env` uses the Supabase session pooler as `haydev_runtime`; a live `SELECT 1` returned the restricted role successfully
- Drift: not proven zero in this run
- Pool: intended Supabase session pooler; live concurrency not tested

## Secrets

- `.env` removed from Git tracking and remains ignored; `.env.example` is explicitly allowed and contains placeholders.
- Working-tree scan found no GitHub PAT or GitHub fine-grained token. Placeholder URLs remain in examples/tests. Git-history `-S` checks found no PAT, `sb_secret_`, `service_role`, or PostgreSQL URI additions.
- The GitHub PAT previously disclosed in chat is compromised and must be revoked; revocation is not verified.
- Database, modern Storage, temporary server-only Storage compatibility, scanner and Owner AI credentials are installed in Vercel. None has been installed on the pending VPS; external alerting remains unconfigured.

## Authentication and origin

- Custom opaque hashed sessions, role/tenant resolution and existing Gate #1 controls remain intact.
- Production cookie code uses `__Host-haydev_session`, HttpOnly, Secure, SameSite=Strict, Path=/ and no Domain.
- Missing and foreign Origin are rejected before mutation/auth processing in production.
- Database-backed login and per-route throttles are present.
- Live login/logout passed for OWNER, ADMIN, MANAGER, MEMBER and VIEWER. The safe OWNER smoke verified host-only cookie attributes, session resolution, correct Origin acceptance, missing/foreign Origin rejection, logout and revoked-session denial.

## Supabase Storage

- Bucket: `haydev-documents`, previously verified private with 25 MB and MIME policy.
- Modern key alone: **FAIL on 2026-09-30** for object operations (`Authorization` required / `Invalid Compact JWS`).
- Temporary compatibility: explicitly approved; the modern key remains `apikey` and the legacy service-role JWT is used only as the server-side Storage `Authorization` header.
- Public denial/signed URL/hash smoke: PASS with the compatibility header and cleanup verified; it must be repeated after every deployment and from the final VPS.

## Malware scanning

- Provider implementation: MetaDefender Cloud v4 adapter.
- Controls: no sample sharing, bounded deadline, at most three retries, provider report/hash verification, require non-zero engines, fail closed on unknown/error.
- Flow: CLEAN -> ACTIVE; INFECTED -> REJECTED; provider failure -> SCAN_FAILED; non-clean objects are not downloadable.
- Unit evidence: 3/3 clean, infected and hash-mismatch tests pass.
- Provider health: PASS from the current production-like environment with the configured MetaDefender key.
- Live CLEAN/EICAR/provider outage: not run against the final HTTPS deployment.

## Owner bootstrap

- Script-only transactional bootstrap with password policy is ready.
- Rerun changes no password/role; conflicting existing data aborts.
- Real organization and five role identities exist and were verified on the custom domain.
- Bootstrap variables are not installed in the web runtime; idempotent bootstrap evidence remains pending.

## Observability

- Structured JSON logs include timestamp, level, event, release, environment, request ID, route, tenant/user IDs where safe, duration, status and safe error code.
- Sensitive field names are filtered; API errors return a safe code/message/request ID.
- Local standalone liveness: HTTP 200.
- Vercel production liveness and readiness: HTTP 200 with configuration, database, Storage, scanner and Owner AI all true.
- External error sink and alert delivery: not configured/tested.

## Backup and restore

- `npm run backup:production`: prepared for PostgreSQL custom dump plus every private Storage object, SHA-256 manifest, and a required encrypted-destination acknowledgement.
- `npm run restore:drill`: prepared; refuses a live target, requires an explicitly named isolated database/bucket, validates DB access and object hashes, then cleans drill objects.
- Real encrypted backup: not run.
- Isolated restore and Recovery Time/Point evidence: not run.

## Reconciliation

- Document/inventory/finance scripts remain available.
- Current production results: not run in this Gate #7 attempt because a production runtime credential was not installed.

## Live tenant and business suites

- Auth/session/origin: PASS for safe checks; all five roles logged in/out, and the OWNER smoke verified cookie hardening and revoked-session denial.
- LeadOS: authenticated read PASS; dedicated-tenant mutation and cross-tenant object probes remain pending.
- QuoteFlow: authenticated read PASS; mutation workflow remains pending.
- DocumentFlow: authenticated read PASS; CLEAN upload, signed download and EICAR quarantine remain pending.
- ERP: authenticated overview read PASS; order/inventory/finance mutation suite remains pending.
- Owner AI provider round trip: PASS in OBSERVE mode; approval/action mutation flow remains pending.
- Automations/webhooks: not run live.
- A production-safe external harness exists at `scripts/production-smoke.mjs`; destructive/mutation portions require explicit flags and a dedicated smoke tenant.

## Security headers

Local standalone evidence:

- HSTS: `max-age=31536000; includeSubDomains`
- CSP: default/base/form/frame/object/script/style/image/font/connect/worker/manifest policy plus upgrade-insecure-requests
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy and cross-origin isolation/resource headers present

Public HTTPS verification: PASS on apex and `www`; HSTS and CSP were observed, and the complete security-header assertions passed in the external smoke.

## Supabase Advisors

- Security Advisor: 0 errors, 0 warnings, 1 informational suggestion (`RLS Enabled No Policy` on `public._prisma_migrations`).
- Performance Advisor: 0 errors, 0 warnings, 177 informational suggestions. The visible result group includes unindexed foreign keys across production-domain tables.

No high-severity advisor finding exists, but the informational set is not a strict clean result. Review/index evidence or an explicit, documented acceptance remains required before cutover; unused-index suggestions must not be acted on while the production database is empty.

## Build and supply chain

- Node: 24.18.0 pinned
- Next.js build: PASS, version 16.3.5, standalone server produced
- TypeScript: PASS
- ESLint: PASS
- Malware/SLA/pricing/DocumentFlow unit/artifact tests: 20 PASS, 0 FAIL
- `npm audit --audit-level=high`: 0 vulnerabilities
- Database-mutating security integration tests now fail closed unless an explicit isolated `HAYDEV_TEST_DATABASE_URL` and confirmation marker are supplied; no such isolated database was available in this run.
- ERP database integration suite: not valid in the current local environment; one pure RBAC test passed, database cases failed to authenticate to the unavailable local database. This is not recorded as a product PASS.
- GitHub CI workflow added; remote execution not yet observed.
- Git remote: `origin` is `HayDev-lab/HayDevOS`, but local `main` and `origin/main` have no merge base (2 local commits versus 35 remote-only commits). Nothing was pushed or force-merged.
- Caddy binary is not installed on this workstation, so provider-host validation of the Caddyfile remains pending.

## Rollback

- Procedure: documented in `docs/production-rollback.md`.
- Tested against a deployed release: no.

## Outstanding blockers

1. Wait for OVH order `259166081` validation, record the assigned VPS address, and establish verified SSH-key access.
2. Replace Namecheap parking records, deploy Caddy/Node, obtain TLS, and verify `haydevos.com` externally.
3. Install the verified `haydev_runtime` URL, separate migration credential, modern Storage key, explicitly approved temporary Storage compatibility JWT, scanner key and Owner AI key in the VPS secret store.
4. Transfer and install the SHA-256 verified standalone artifact, then repeat five-role authentication on OVH.
5. Configure external error monitoring credentials; copy the verified Owner AI configuration into the VPS secret store during cutover.
6. Execute encrypted backup and isolated DB/Storage restore drill.
7. Review/remediate Supabase Advisor informational findings and capture reconciliation reports.
8. Repeat Storage/scanner checks from the VPS and pass every live security/business/malware/rollback check.
9. Revoke and audit the previously disclosed GitHub PAT.
10. Reconcile the unrelated local/GitHub histories through a reviewed migration branch; never force-push this dirty multi-gate working tree.

## Final production status

```text
CODE/OPERATIONS READINESS = PASS
VERCEL PRODUCTION = LIVE
OVH CUTOVER = BLOCKED
GATE #7 = BLOCKED
```
