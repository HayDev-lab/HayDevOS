# Production rollback

## Trigger

Rollback immediately for cross-tenant exposure, authentication/origin regression, public Storage access, malware false-clean, secret leakage, readiness failure after deployment, or material business-data corruption. For a provider-wide outage with unchanged code, containment/failover may be safer than redeploying.

## Procedure

1. Freeze traffic shift and record release ID, time, symptoms, request IDs and migration version. Page the incident owner.
2. Disable affected high-risk functionality or remove the new instance from the load balancer. Preserve logs and audit records.
3. Decide database compatibility. Prisma migrations must be backward-compatible for code-only rollback. Never improvise a down migration against live data.
4. Start the previous immutable artifact with its existing production secrets; do not restore old bootstrap variables or a retired key.
5. Require local and public health/readiness, authentication, origin, cookie, cross-tenant and affected-module smoke checks before returning traffic.
6. Run document/inventory/finance reconciliation. Keep the new release and evidence intact for analysis.
7. If data restoration is unavoidable, stop all writes, obtain explicit incident authority, select the verified pre-release backup, restore to isolation first, compare counts/hashes/audit timeline, then perform a separately approved production recovery.

## Validation

Rollback is complete only when public readiness is green, sessions behave as intended, no tenant boundary regression exists, private files remain private, scanner fail-closed behavior holds, reconciliation is clean, and monitoring has remained stable through the observation window.

Do not call the rollback tested until this procedure has been executed on staging/isolated infrastructure using real artifacts.
