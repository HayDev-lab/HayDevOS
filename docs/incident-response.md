# Incident response

## Severity and first actions

- **SEV-1:** cross-tenant access, public private files, malware false-clean, production database compromise, active secret exposure, unauthorized Owner AI action. Contain immediately, page security/operations leadership, preserve evidence and suspend affected writes/access.
- **SEV-2:** sustained readiness failure, scanner outage/backlog, backup failure, database/Storage degradation, repeated 5xx. Fail closed, reduce traffic and restore service without weakening controls.
- **SEV-3:** isolated provider error or non-security regression with a safe workaround. Track and repair through the normal release process.

Never paste credentials, cookies, document contents, customer PII or raw database URLs into the incident channel.

## Playbooks

### Suspected cross-tenant access

Disable the affected route/release, preserve request IDs and audit rows, identify organizations/objects/time range using read-only queries, rotate relevant server credentials if bypass is possible, and test every sibling endpoint. Notify affected parties according to legal obligations only after scope is evidence-backed.

### Malware upload

Keep the object quarantined, deny signed access, preserve hash/provider reference/audit timeline, and do not download it to an analyst workstation. If a false-clean is possible, disable uploads/downloads for affected objects, search by hash and rotate provider configuration only after containment.

### Database compromise

Remove runtime access, revoke/rotate credentials, preserve Supabase/Postgres logs, invalidate sessions, identify writes and role changes, and restore only after an isolated forensic/restore validation. Never grant the runtime role superuser or bypass-RLS as a workaround.

### Storage exposure

Make the bucket private, revoke keys and signed URLs where possible, inventory access logs/objects, run document reconciliation and verify tenant ownership before reopening. Do not mass-delete evidence.

### Owner AI unsafe action

Disable the provider/route, freeze pending approvals and relevant automation, preserve run/tool/action/audit records, inspect whether an approved domain service executed, and reconcile the affected business domain. Provider text alone is never proof of an executed action.

### Published secret

Revoke, replace, redeploy, prove the old value invalid and audit its privileges/activity. The previously shared GitHub PAT is in this category.

## Closure

An incident closes only after containment, verified recovery, affected-data scope, credential/session rotation, monitoring validation, documented timeline/root cause, corrective actions with owners, and a post-incident review. Gate/release documentation must be corrected if earlier evidence was invalidated.
