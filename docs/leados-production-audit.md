# LeadOS production audit

Date: 2026-09-25  
Scope: Production Gate #3, before implementation

## Current LeadOS architecture

LeadOS is a client-rendered module mounted by the existing HayDevOS shell. `LeadOSView` owns tabs, search, the create dialog, and the selected-lead drawer. Each tab imports module-level arrays and derived helpers from `src/modules/leados/data.ts`; that file in turn imports foundation mocks from `src/lib/mock` and adds more generated records.

The current visual module does not call a LeadOS API. Writes such as lead creation, stage changes, notes, and task completion mutate component state or only show a toast. Reloading or restarting discards them. The database schema already contains `Lead`, `LeadActivity`, `Task`, `WebhookEvent`, `Automation`, and `AutomationRun`, but the UI does not use them.

The production baseline around LeadOS is reusable: database-backed custom sessions, server-resolved `orgId`, centralized API error handling, strict JSON parsing/body limits, same-origin mutation protection, RBAC helpers, Prisma/PostgreSQL, RLS, restricted runtime role, tenant relationship triggers, persistent Owner AI audit/approval state, and production security headers.

## Current UI state

The existing visual surface is complete and should be preserved:

- Dashboard with KPIs, stage/source charts, and recent activity.
- Lead table with search, stage/source filtering, sorting, and detail drawer.
- Seven-column pipeline board with drag-and-drop stage changes.
- Tasks/SLA operations view.
- Sources/Meta presentation.
- Analytics, team, and settings views.
- New-lead dialog and CSV export affordance.
- Lead detail with contact data, stage controls, SLA cards, timeline, tasks, notes, and AI analysis controls.

Missing production states are loading, request error, retry, true empty-state handling, mutation pending/error handling, server pagination, and reconciliation after writes. Current mutations are optimistic-only and never reach PostgreSQL.

## Synthetic data sources

- `src/lib/mock/leads.ts`: twelve hard-coded leads and eight activities.
- `src/modules/leados/data.ts`: ten additional runtime-dated leads, activities, tasks, static team members, global SLA settings, source economics, and all dashboard/analytics derivations.
- `src/modules/leados/components/*`: all tabs consume `allLeads`, `allActivities`, `mockTasks`, `TEAM_MEMBERS`, and/or `SLA_POLICIES` directly.
- `LeadDetail.tsx`: hard-coded AI responses, locally completed tasks, locally submitted notes, and a delayed timer masquerading as AI work.
- `SettingsView.tsx`: pipelines, stages, custom fields, and SLA configuration exist only in React state.
- `SourcesView.tsx`: Meta connectivity is local state and not an integration result.
- `src/lib/seed.ts`: optional development seed imports mock records. It is not safe as an automatic production seed.
- `src/app/api/owner-ai/tools.ts`: the existing read-tool implementations use cross-module mocks. Production currently disables those tools instead of supplying tenant PostgreSQL data.

The persisted Zustand app store only retains shell preferences (`activeModule`, locale, sidebar, theme), not LeadOS records. It is not currently a LeadOS source of truth.

## Existing database models

- `Lead`: tenant key, contact fields, source, string stage, owner, Decimal value, response/activity/SLA timestamps.
- `LeadActivity`: tenant and lead keys, type/body/timestamp.
- `Task`: tenant key, optional lead/assignee/owner, due time, priority/status.
- `WebhookEvent`: tenant/provider/event id with a database unique constraint and processed flag.
- `Automation` and `AutomationRun`: tenant-owned definitions and executions.
- `AuditLog`: tenant, actor, action, entity, JSON metadata, timestamp.
- `Membership`: user/organization/role tuple used by assignment triggers and application checks.

Missing or incomplete for the UI contract: tenant pipelines and stages, persisted notes with authorship, task type/creator/completion/update timestamps, normalized contact values, external lead identity, per-tenant SLA policy, pipeline/stage FKs on leads, webhook processing metadata, and automation replay keys.

## Existing APIs

There are authenticated APIs for login/logout/session/organization switching and Owner AI. There are no `/api/leados/*` endpoints. The root `/api` endpoint is informational.

The reusable API contract is `withTenantApi` plus `parseJson` and `ApiError`: it provides authentication, server tenant context, optional role gates, same-origin checks for mutations, JSON content-type/body limits, strict Zod errors, no-store responses, and normalized 4xx/5xx responses.

## Existing domain logic

Current LeadOS logic consists of client-only calculations for SLA badges, stage/source/team summaries, funnel/ROI charts, weekly buckets, search/filter/sort, and local state changes. It has no authoritative repository or service boundary and no atomic write flows.

Some logic is worth preserving as presentation semantics: the seven default stage keys, six source keys, three SLA states, visual stage/source metadata, and current DTO shape. The calculation must move to server/domain code where it affects filtering, sorting, KPIs, or decisions.

## Existing Owner AI integration

Owner AI already has authenticated tenant-scoped routes, persisted conversations/messages/actions/approvals/audit events, role restrictions, action classifications, and execute-once approval handling. Its `setLeadStage`, `createTask`, and `createInternalNote` executor paths currently write Prisma directly; they bypass a LeadOS business service and do not consistently create LeadOS activity/audit/automation events.

Owner AI read tools are mock-based. Production deliberately fails them closed. Gate #3 must add persistent lead read tools and route all lead mutations through the same canonical domain services used by the UI.

## Existing automations

The automation UI and module data are synthetic. PostgreSQL models exist, and Owner AI can queue an `AutomationRun`, but there is no production lead-event dispatcher or worker performing business actions. No existing production automation code is mature enough to copy.

Gate #3 can safely add durable, idempotent lead event/run creation and a canonical lead-action adapter. External execution/worker delivery remains a separately deployable concern and must not be simulated.

## Tenant risks

- Every current mock carries a hard-coded organization and bypasses session tenancy entirely.
- LeadOS UI never proves that records belong to the active server session.
- Existing `Lead.stage` has no tenant-owned stage relationship.
- Notes are not persisted or tenant-scoped.
- Cross-tenant deduplication rules do not exist.
- Owner AI read tools are not tenant-backed; enabling the current mock tools in production would leak synthetic/global data.
- Direct `id` writes in ad hoc code can become IDORs without `{ id, orgId }` predicates.
- Tenant cache invalidation must occur on login/logout/org switch; current module constants cannot be cleared.

## Authorization risks

- Current LeadOS buttons are not protected by server permissions because there are no server mutations.
- Role checks would be easy to scatter across routes unless centralized in a LeadOS permission layer.
- Owner AI direct Prisma mutations can drift from UI authorization rules.
- Assignment needs an active same-organization membership check before relying on the DB trigger.
- Pipeline/SLA management requires stronger roles than ordinary lead read/create/edit.
- Foreign-tenant resources must resolve as 404 to avoid enumeration.

## Data consistency risks

- Create, activity, audit, and automation event are not atomic.
- Stage moves do not create activity or audit records.
- Notes and task completions vanish on reload.
- Email/phone/external-id normalization and race-safe uniqueness are absent.
- SLA policy is global hard-coded UI state.
- Client-derived KPIs and filters will diverge from the database at scale.
- Existing Lead string stage can diverge from a future stage entity unless the migration makes the relation canonical.
- Webhook uniqueness exists, but no claim/process/error lifecycle is implemented.
- Automation runs do not have a replay/idempotency key.

## Reusable code

- `src/lib/auth/session.ts`: authoritative `AuthContext` (`userId`, `orgId`, role).
- `src/lib/api/*`: request validation, origin protection, error normalization, no-store semantics.
- `src/lib/db.ts`: server-only Prisma access.
- Prisma PostgreSQL schema/migration history and Decimal/timestamptz conventions.
- `haydev_assert_same_org` and `haydev_assert_org_membership` database trigger functions.
- Existing RLS/private runtime-role model and zero browser-table grants.
- `AuditLog` and persistent Owner AI audit/approval architecture.
- LeadOS visual components, translation keys, stage/source presentation metadata, and formatting utilities.
- `WebhookEvent` database unique key as the idempotency foundation.

No separate mature HayDevLeadsOS implementation was found under the accessible project, document, download, or drive repository roots. The `.kilo` worktree contains the same mock implementation and offers no additional production logic.

## Missing production components

- Server-only LeadOS domain context, permissions, errors, schemas, repository, service, normalization/dedup, SLA, activity/audit, ingestion, and automation-event modules.
- Schema additions and a Prisma migration for pipelines/stages, notes, SLA policy, normalized identities, task lifecycle, and automation idempotency.
- DB triggers for all new tenant relationships and membership references.
- RLS/runtime grants for all new tables without browser grants.
- Tenant-scoped CRUD/detail/stage/assignment/note/task/settings/dashboard APIs.
- Server-side search/filter/sort/pagination and aggregate KPIs.
- Persistent LeadOS UI adapter with loading/error/empty/retry and mutation reconciliation.
- Persistent Owner AI lead reads and canonical mutations.
- Integration tests for application tenant isolation, DB invariants, dedup, webhook replay, SLA boundaries, pagination, Owner AI, persistence, and production synthetic-data exclusion.

## Migration plan

1. Extend Prisma with minimal LeadOS entities/fields and create one additive migration.
2. Backfill a default pipeline and seven default stages for any existing organizations/leads, then make lead pipeline/stage relations required.
3. Add tenant-aware unique/index constraints, triggers, RLS policies, runtime privileges, and immutable/replay invariants.
4. Implement server-only repository/domain services with atomic lead/activity/audit/event writes.
5. Add strict tenant APIs and safe DTOs.
6. Replace module records with a request-backed provider; retain the existing layout and presentation constants.
7. Route UI mutations, Owner AI lead tools/actions, and automation lead actions through the domain services.
8. Keep mock files for other modules and development seed compatibility, but prove no production LeadOS import path reaches them.
9. Run clean PostgreSQL migration/integration suites, lint, TypeScript, Prisma validation/generation, build, audit, schema drift, remote verification, and Supabase advisors.

## Files to modify

- `prisma/schema.prisma` and a new committed Prisma migration.
- New `src/lib/leads/*` canonical domain modules.
- New `src/app/api/leados/*` route handlers.
- `src/modules/leados/data.ts`, types, root view, and existing LeadOS components only as needed to bind real data and real mutations.
- `src/lib/owner-ai/action-executor.ts`, `src/app/api/owner-ai/tools.ts`, and `src/app/api/owner-ai/route.ts` for canonical lead operations.
- `src/lib/seed.ts` to make synthetic seeding explicitly non-production.
- Package scripts and focused LeadOS tests.
- `docs/leados-production.md`, `docs/production-security.md`, and `docs/production-gate-3-leados.md`.

## Files not to modify

- Authentication strategy or cookie/session semantics.
- Supabase Auth or any browser Supabase client (neither will be introduced).
- Existing security headers/CSP except if a verified LeadOS requirement demands it.
- Other vertical UI modules (`QuoteFlow`, `DocumentFlow`, ERP, Audit, Integrations) beyond type-safe shared interfaces required by LeadOS.
- Existing historical migrations; changes go into a new migration.
- Unrelated user-modified shell, upload, download, runtime, or build files.
- Visual design system and translation architecture.

