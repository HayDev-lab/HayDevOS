# Production release checklist

Every item is binary. Attach command output, provider screenshot/export, or monitoring event to the release record. An unchecked item means Gate #7 is not PASS.

## Before deploy

- [ ] Hosting/VPS, immutable release ID, domain owner, and rollback owner recorded.
- [ ] Exposed GitHub PAT revoked, replacement created only if needed, and old token proven invalid.
- [ ] Repository and Git history leak scan reviewed; `.env` is untracked.
- [ ] Node version equals `.nvmrc`; `npm ci` used the committed lockfile.
- [ ] `npm run lint`, `npm run typecheck`, required tests, `npm run security:audit`, and `npm run build` pass.
- [ ] `DATABASE_URL` uses `haydev_runtime`; `DIRECT_URL` is confined to the migration job.
- [ ] Remote runtime role remains `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`.
- [ ] All Prisma migrations are applied, none incomplete, and schema drift is zero.
- [ ] `APP_ORIGINS` contains only the final HTTPS origin(s).
- [ ] Modern `SUPABASE_SECRET_KEY` Storage CRUD/sign/delete smoke passes with no legacy JWT.
- [ ] Private bucket limit/MIME policy verified; anonymous access denied.
- [ ] MetaDefender key installed; provider health and private-scan policy verified.
- [ ] Owner AI endpoint/key/model installed and approved.
- [ ] Error sink and alert routing tested without secrets.
- [ ] Encrypted backup completed and manifest hash copied to the release record.
- [ ] Isolated database and Storage restore drill passes with hash verification.
- [ ] Supabase Security Advisor and Performance Advisor reviewed and clean or explicitly accepted.
- [ ] Rollback artifact, database compatibility decision, and on-call owner ready.

## Deploy and bootstrap

- [ ] One migration job holds the deployment lock and completes before traffic shift.
- [ ] Immutable standalone artifact deployed; `/api/health` returns 200.
- [ ] `/api/ready` returns 200 with database, Storage and scanner true.
- [ ] Real OWNER bootstrapped into the intended organization.
- [ ] Bootstrap variables removed and redeploy/restart completed.
- [ ] A second bootstrap attempt makes no changes.
- [ ] HTTP is inaccessible externally or redirects to HTTPS.
- [ ] TLS certificate/chain and production hostname verified.

## Live acceptance

- [ ] Secure `__Host-haydev_session` cookie has HttpOnly, Secure, SameSite=Strict, Path=/ and no Domain.
- [ ] Login, session, logout and restart/session persistence pass.
- [ ] Correct Origin accepted; foreign and missing Origin rejected.
- [ ] Unauthenticated, org-spoof, cross-tenant and RBAC probes return the intended safe status.
- [ ] LeadOS live suite passes in the dedicated smoke tenant.
- [ ] QuoteFlow live suite passes.
- [ ] DocumentFlow clean upload becomes CLEAN/ACTIVE and downloads through a short signed URL.
- [ ] EICAR becomes INFECTED/REJECTED and download returns locked/denied.
- [ ] Scanner unavailability remains fail-closed.
- [ ] ERP order, inventory, fulfillment and payment suite passes.
- [ ] Owner AI live provider and approval workflow pass with no synthetic fallback.
- [ ] Automation idempotency and webhook authentication/replay behavior pass where configured.
- [ ] Inventory, finance and document reconciliation report zero errors.
- [ ] Security headers and normalized error responses verified over the public URL.
- [ ] Bounded concurrent read smoke does not exhaust the database pool.
- [ ] Logs contain request/release IDs and no secret/request-body leakage.
- [ ] `npm run production:smoke` passes from outside the hosting network.

## Final decision

- [ ] Production URL and evidence recorded in `docs/production-gate-7-deployment.md`.
- [ ] All live checks above are complete.
- [ ] Gate verdict is changed to PASS only after the last checkbox is supported by evidence.
