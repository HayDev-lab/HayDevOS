# Permissions and approvals

## Existing enforcement reused

`withTenantApi` authenticates the server session, checks RBAC, enforces same-origin for mutations, applies an organization/user rate-limit key and records request audit fields. Owner AI conversation lookup is tenant/user scoped. `executeTenantAction` recomputes membership and routes approved writes through existing LeadOS, QuoteFlow, DocumentFlow, ERP and automation services.

The Owner AI approval route currently restricts decisions to `OWNER`/`ADMIN`; actions are not trusted merely because an LLM emitted a fenced block. These paths remain the execution boundary when OpenClaw is enabled.

## OpenClaw-specific policy

* The client adapter derives tenant/user/role/correlation IDs from `AuthContext`; no AI, browser, webhook or broker payload can submit those authorities.
* The broker may reason over the bounded request but has no domain database credential and no permission to perform write actions itself.
* The app recognizes only registered tool names. Input validation occurs before the canonical domain service call.
* High-impact actions remain pending until server-side approval binds the actor, tenant, exact action arguments/action hash and expiry; execution consumes the approval only once.
* Provider/customer text, documents, retrieved web data and model output are untrusted content. They cannot request a new automation, invoke shell/browser functionality, disclose other conversations or execute ERP/financial changes.
* Audit logs retain correlation IDs, tool/action results and safe error codes, never Gateway tokens, raw provider secrets or user-visible private model prompts. A broker request ID is unique per model turn; an identical retry is response-idempotent and a changed replay is rejected.

## Required tests before a write-capable enablement

1. cross-tenant API/tool/conversation/memory negative tests;
2. forged tenant, role, approval and idempotency identifiers rejected;
3. replayed broker/webhook request produces no duplicate externally visible action;
4. approval action-hash mismatch and expired approval rejected;
5. agent failure, provider 429/5xx and broker timeout leave domain state unchanged;
6. a public-message payload cannot call an Owner/ERP tool.
