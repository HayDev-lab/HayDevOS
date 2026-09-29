# Production Gate #3 — LeadOS

Date: 2026-09-25

## Implemented scope

- PostgreSQL-backed LeadOS UI, CRUD, pipeline transitions, assignments, tasks, notes, activity, SLA, aggregates, export, and ingestion.
- Server-resolved tenant context, central RBAC, strict Zod contracts, same-origin mutation checks, and safe DTOs.
- Tenant-aware normalized deduplication, composite tenant foreign keys, soft archive, append-only runtime activity, and transactional audit/event writes.
- Webhook and automation replay idempotency.
- Owner AI persistent read adapters and canonical lead action execution.
- Approved lead automation actions routed through canonical domain services.
- Organization-switch provider remount plus tenant-scoped API verification.

## Verification evidence

The following checks passed against a clean temporary PostgreSQL 17 database using all committed migrations:

```text
prisma migrate deploy                         PASS (6/6)
prisma migrate status                         PASS (up to date)
prisma migrate diff                           PASS (No difference detected)
prisma validate / generate                    PASS
eslint .                                      PASS
tsc --noEmit                                  PASS
next build                                    PASS
npm audit / npm audit --omit=dev              PASS (0 vulnerabilities)
LeadOS SLA boundary tests                     PASS (5/5)
PostgreSQL tenant-integrity suite              PASS
Production auth HTTP smoke                    PASS
Production LeadOS HTTP suite                  PASS
Owner AI persistent LeadOS read suite        PASS
Production server restart persistence         PASS
Organization switch / cross-tenant HTTP suite PASS
Supabase security/performance advisors        PASS (No issues found)
```

The HTTP suite ran the production standalone server as restricted `haydev_runtime` and verified strict tenant-field rejection, create/read/search/filter/sort/pagination, normalized dedup, stage transition, note/task/activity persistence, task completion, SLA persistence, and webhook replay returning the original lead.

The committed migration was also applied to the linked Supabase project `rljeqbffppqfxkwcptgs`. Its Prisma ledger entry matches the committed SHA-256 checksum `25c79d5bfe65f55904b1a1993eaf9ec9e08bc3b1a0f4a887c2ef6d2198e0957a`. The verified remote database remained empty (`0` organizations, users, and leads).

## Security invariants verified

- The runtime role is not superuser, cannot create roles/databases/schema objects, has no `BYPASSRLS`, and cannot read `_prisma_migrations`.
- `anon` and `authenticated` receive no application-table access from the migrations.
- Task and activity composite foreign keys reject a Lead belonging to another organization.
- The same normalized/external identity may exist independently in two organizations.
- A duplicate provider event within one organization produces one business result.
- A duplicate automation event produces one run.
- Switching to another valid membership produces an empty tenant overview and a 404 for the original tenant's lead; switching back restores it.
- The linked Supabase project has six completed Prisma migrations, RLS enabled on every application table, zero `anon`/`authenticated` table grants, zero runtime grants on `_prisma_migrations`, all four new composite tenant foreign keys, and a non-privileged runtime role without `BYPASSRLS`.
- Supabase security and performance advisors both report `No issues found` after the Gate #3 migration.

## Remaining deployment-only checks

Local Gate #3 evidence does not replace production cutover. Before declaring the deployed environment PASS:

1. configure a permanent generated password for `haydev_runtime`, the corresponding server-only `DATABASE_URL`, and exact HTTPS `APP_ORIGINS` in the deployment secret store;
2. deploy and repeat the HTTP suites against the real HTTPS URL;
3. bootstrap the real owner only if the target is still empty, then remove bootstrap variables.

The code gate and linked database migration are PASS. Until those deployment-only checks are completed, the live production rollout is not yet certified.
