# LeadOS production architecture

LeadOS is a server-rendered, tenant-scoped PostgreSQL domain. The browser never selects an organization for data access and never writes to Supabase directly.

## Request and domain flow

```text
Authenticated browser / Owner AI / automation worker
  -> Next.js route or authenticated executor
  -> server session resolves user + active organization + role
  -> Zod input validation and central LeadOS permission check
  -> src/lib/leads service transaction
  -> tenant-scoped repository query
  -> Prisma -> haydev_runtime -> Supabase PostgreSQL
  -> activity + audit + idempotent automation event
```

`DomainContext.orgId` is created only from the database-backed session. LeadOS schemas are strict and do not accept `orgId`, role, actor, or audit metadata from the client.

## Data model

- `LeadPipeline` and `LeadPipelineStage` own tenant pipeline configuration.
- `Lead` stores normalized contact keys, tenant-aware external identity, a composite tenant/pipeline/stage reference, money as `Decimal(19,4)`, soft-archive state, and SLA timestamps.
- `LeadActivity` is an append-only business event stream for the runtime role.
- `LeadNote` stores authored internal notes separately from activity summaries.
- `Task` stores lead follow-ups, creator/assignee, type, priority, due/completed timestamps, and tenant-safe lead references.
- `LeadSlaPolicy` stores the per-organization SLA thresholds in minutes.
- `WebhookEvent` provides `(orgId, provider, eventId)` idempotency and records the resulting entity.
- `AutomationRun` provides `(orgId, automationId, idempotencyKey)` idempotency.

Composite foreign keys prevent a task, note, activity, or stage reference from crossing organizations. Membership triggers validate actors, creators, owners, and assignees.

## Domain services

The canonical API is in `src/lib/leads/service.ts`:

- `createLead`, `getLead`, `listLeadRecords`, `updateLead`, `archiveLead`
- `assignLead`, `changeLeadStage`
- `addLeadNote`, `createLeadTask`, `completeLeadTask`
- `listLeadActivities`, `listLeadTasks`
- `getLeadOverview`, `updateSlaPolicy`
- `ingestLead`
- Owner AI read adapters

All significant writes validate permissions, scope every lookup by `orgId`, use a transaction for related writes, append audit/activity where applicable, and emit idempotent automation events.

Owner AI lead mutations call these services through `src/lib/owner-ai/action-executor.ts`. Persistent Owner AI reads use the same services, including the deterministic fallback when the LLM provider is unavailable. Approved automation runs execute recognized lead actions through `src/lib/leads/automation-executor.ts`; the worker never updates `Lead` directly.

## HTTP API

All routes require a valid session. Mutations also require an allowed `Origin`.

- `GET/POST /api/leados/leads`
- `GET/PATCH/DELETE /api/leados/leads/:id`
- `POST /api/leados/leads/:id/stage`
- `POST /api/leados/leads/:id/assign`
- `POST /api/leados/leads/:id/notes`
- `POST /api/leados/leads/:id/tasks`
- `GET /api/leados/activities`
- `GET /api/leados/tasks`
- `POST /api/leados/tasks/:id/complete`
- `GET /api/leados/overview`
- `GET/PATCH /api/leados/settings`
- `POST /api/leados/ingest`
- `GET /api/leados/export`

List search, filters, sorting, and pagination are evaluated in PostgreSQL. CSV export is produced on the server and protects spreadsheet formula prefixes.

## Permissions

`src/lib/leads/permissions.ts` is the single LeadOS role matrix.

- `VIEWER`: read only.
- `MEMBER`: read and create/update tenant leads, notes, and tasks; cannot assign, move pipeline stage, archive, manage SLA, or ingest.
- `MANAGER`: operational lead assignment, stage movement, and archive in addition to member actions.
- `ADMIN` and `OWNER`: full LeadOS, pipeline/SLA, and integration-ingestion permissions.

Owner AI and automation retain the initiating user's tenant and role. They cannot bypass the same permission checks.

## SLA semantics

The first-response due timestamp is persisted when a lead is created. A lead is:

- `target` before `dueAt - warningMinutes`;
- `warning` at and after that boundary but before `dueAt`;
- `breach` at and after `dueAt`;
- completed/on-target after a first response or when its stage is closed.

Tasks expose an `overdue` value derived from persisted `dueAt`, status, and server time. Changing SLA policy does not rewrite historical timestamps silently.

## Provisioning and operations

Migration `20260925030000_leados_production_domain` provisions default pipeline stages and SLA policy for every existing organization. `npm run auth:bootstrap` provisions them atomically for a new first organization. GET requests do not provision or mutate data.

Synthetic seeding is rejected when `NODE_ENV=production`. Meta/public webhooks are intentionally not simulated; a public provider route must verify its signature before calling the internal ingestion domain service.

Verification commands and production evidence are recorded in `docs/production-gate-3-leados.md`.
