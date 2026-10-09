# Production Gate #7 readiness audit

Audit date: 2026-09-27. Linked Supabase project: `rljeqbffppqfxkwcptgs`.

## Executive result

The Vercel project `haydevos` is deployed to the production target on `https://haydevos.com`, reports `READY`, and the public login page, `/api/health`, and `/api/ready` return HTTP 200. Runtime readiness passes with database, Storage, scanner, configuration, and Owner AI checks all true. The production-safe authenticated smoke passed for OWNER module reads, origin/cookie/session controls, Owner AI, logout and session revocation; destructive business, EICAR and cross-tenant object suites remain pending.

## Verified facts

| Area | Evidence | Status |
| --- | --- | --- |
| Runtime | Next.js standalone output; Node `24.18.0` pinned in `.nvmrc`; `node server.js` startup | Ready in code |
| Edge/proxy | Vercel currently terminates TLS for `haydevos.com`; the prepared Caddy configuration covers apex and `www`, enforces body limits and forwards only to `127.0.0.1:3000` after OVH cutover | Vercel live; OVH pending |
| Database | Remote PostgreSQL 17.6, SSL on, 9/9 Prisma migrations applied, no incomplete migration | Verified remotely |
| Runtime role | `haydev_runtime`: login, `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE`; password synchronized with the server-only runtime URL and connection verified as the restricted role | Verified remotely |
| Tenant RLS | 49/49 tables containing `orgId` have RLS enabled | Verified remotely |
| Production identities | 1 organization, 5 users and 5 memberships; OWNER, ADMIN, MANAGER, MEMBER and VIEWER login/logout each passed on `haydevos.com` | Verified remotely |
| Local runtime credential | `.env` uses the `eu-central-1` transaction pooler on port `6543` with `pgbouncer=true`, `connection_limit=5` and `sslmode=require`; `DIRECT_URL` remains a session-pooler URL on port `5432` and should include `sslmode=require` | Runtime URL verified; direct migration URL needs final SSL parameter |
| Environment | Zod validation for required core variables and exact HTTPS origins; production startup fails closed | Ready in code |
| Secrets | `.env` removed from Git tracking and ignored; `.env.example` contains placeholders only | Ready in working tree |
| Storage | `haydev-documents` is private, 25 MB, MIME-restricted; on 2026-09-30 the modern key alone failed object operations, while the explicitly approved server-only compatibility JWT passed upload, hash round-trip, signed access, anonymous denial and cleanup | Verified remotely with temporary compatibility |
| Data API | 0/55 tables and 0/15 functions exposed; automatic exposure of new tables is disabled | Hardened remotely |
| Supabase service status | Dashboard displayed an investigation banner; the public status page currently reports API Gateway degraded performance and an unresolved JWT-rejection incident | External platform incident; defer live cutover |
| Malware | MetaDefender Cloud adapter, private sample mode, bounded timeout/retry, hash matching, clean/infected/error semantics | Production Secret installed and provider health verified; live EICAR smoke still pending |
| Upload quarantine | Scanner configuration is resolved before DB/Storage side effects; with a configured scanner the upload is stored as `PENDING_SCAN`, and only trusted CLEAN becomes ACTIVE | Ready in code; missing scanner rejects uploads before persistence |
| Owner AI | Ollama Cloud via the OpenAI-compatible `https://ollama.com/v1` endpoint, `glm-5.3-flash:cloud`, 120-second bounded request, and no production offline fallback | Production API key is a Vercel Secret; direct live provider smoke passed and readiness reports `ownerAi: true` |
| Observability | JSON logs, request IDs, sanitized errors, optional alert webhook, `/api/health`, `/api/ready` | Ready in code; external alert sink absent |
| Rate limits | Database-backed per-tenant/user limits plus stricter upload/export/ingest/AI/document-generation limits | Ready in code |
| Bootstrap | Script-only, strong password checks, transactional; rerun makes no changes and conflicts fail closed | Five real role identities exist; bootstrap idempotency evidence remains pending |
| Backups | DB + private Storage backup script with SHA-256 manifest and encrypted-destination acknowledgement | Ready in code; no real backup executed |
| Restore | Destructive restore is restricted to an explicitly named isolated target; DB and Storage hashes are verified | Ready in code; isolated target absent |
| CI | Locked install, Prisma generation, lint, TypeScript, unit tests, audit and production build | Ready in code; not yet run by GitHub |
| Git lineage | `origin` now points to `HayDev-lab/HayDevOS`, but local `main` and `origin/main` have no merge base (2 local versus 35 remote-only commits) | Deployment blocker; do not force-push or merge blindly |
| Live security | `scripts/production-smoke.mjs` checks HTTPS, headers, origins, cookies, auth, modules, optional cross-tenant/AI/EICAR | Safe authenticated suite passed; cross-tenant object, uploads/EICAR and business mutations remain pending |
| Vercel deployment | Project `haydevos`, deployment `dpl_EZdrdjCyW8ZQjTximB5QNEizahqT`, production alias `https://haydevos.com`, status `READY` | Deployed; health and readiness HTTP 200 with database/storage/scanner/configuration/Owner AI true |
| OVH artifact | Standalone archive `haydevos-20260926T221428Z-57c4f3017178-dirty.tar.gz`, SHA-256 `68bc63917198a9531ad71b14b4daed6de22efffc297830323a50bd1d2ffc950e`; 2,460 entries and zero forbidden environment/Git/data paths | Prepared locally; source tree is explicitly marked dirty and VPS is not provisioned |

## Findings that block live cutover

1. OVH order `259166081` is still in additional processing; no VPS, public IP or SSH endpoint exists yet, so the self-hosted cutover cannot start.
2. No external error/alert sink is configured.
3. No provider backup evidence, encrypted logical backup, isolated database restore, or Storage restore drill has run.
4. Supabase Advisors have 0 errors and 0 warnings, but are not strictly empty: Security has 1 informational `_prisma_migrations` RLS/no-policy suggestion; Performance has 177 informational suggestions, including unindexed foreign keys. They require reviewed acceptance or remediation.
5. The local production-gate work and GitHub `main` have unrelated histories; an owner must reconcile source lineage before any PR/push/deploy.
6. The Supabase service-status observation from 2026-09-26 may be stale; re-check provider status immediately before OVH cutover.

## Security decisions

- Custom opaque sessions, tenant resolution, RBAC, Prisma, and RLS remain the only authorization model.
- Privileged Storage access remains server-only and is reached only after session, tenant, role and object ownership checks.
- Legacy `service_role` is accepted only as the explicitly approved temporary Storage authorization compatibility header; it remains server-only, monitored, and scheduled for removal after a modern-key smoke passes.
- Owner AI is optional for core server startup; its absence is reported by readiness but does not take down LeadOS/QuoteFlow/DocumentFlow/ERP.
- User uploads fail closed before persistence when malware scanning is unavailable, without taking down the authenticated UI. Server-generated PDF/DOCX artifacts use the documented `NOT_REQUIRED` trusted-renderer policy.
- Vercel is now the selected deployment target for the current preview/production artifact. The 25 MB upload route still requires a deployment-specific request-size smoke test and should be revisited if the platform rejects large uploads.

## Reproducible evidence commands

```powershell
npm ci
npm run db:generate
npm run typecheck
npm run lint
npm run test:malware
npm run test:sla
npm run test:quoteflow-pricing
npm run test:documentflow
npm run security:audit
npm run build
npx supabase db query --linked --file scripts/production-database-audit.sql --output json
```

The database-mutating integration suites require an isolated test database. Do not point them at production.
