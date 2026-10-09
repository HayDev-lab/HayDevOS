# HayDevOS × OpenClaw baseline

**Recorded:** 2026-10-09  
**Repository:** `D:\Projects\HayDev\HayDevOSv1`  
**Revision:** `b255ebbe549879225e6b6821c9b4ff9eb853bb33` (`main`)  
**Working tree at start:** one untracked file, `.tmp-db-check.cjs`; it is not part of this work and has not been modified.

## Actual application baseline

HayDevOS is a Next.js App Router application (installed `next` resolved to 16.3.5 at build), React 19, TypeScript, Prisma 6, PostgreSQL/Supabase Storage and Node 24.18.0. `package.json` declares npm 11.6.0 and Node 24.x.

The app already has tenant-scoped domain modules and API routes for LeadOS, QuoteFlow, DocumentFlow, ERP, automations and Owner AI. `src/lib/auth/session.ts` resolves the active organization from the server-side session and membership. `src/lib/api/handler.ts` applies auth, role checks, origin checks for mutations, rate limits, audit logging and `no-store` responses.

Owner AI is served by `src/app/api/owner-ai/route.ts`. Its persisted conversations are scoped by `AiConversation.orgId` and `AiConversation.userId`; the route dispatches several real tenant-authorized reads through the LeadOS, QuoteFlow, DocumentFlow and ERP domain services. Write actions run through `src/lib/owner-ai/action-executor.ts` and the existing approval/audit flow.

Not all Owner AI functionality is live domain behavior. `src/app/api/owner-ai/tools.ts` also contains an explicit mock-data read registry, available only when the development-only demo flag is enabled. The Integration Hub (`src/modules/integrations/`) is client-side in-memory state with no Integration API or provider webhook routes. There is no Inbox, social publishing, Meta connector, Marketing API connector, or OpenClaw integration in the checked-out source.

## Security and runtime baseline

* Prisma migrations establish a restricted `haydev_runtime` role and enable RLS on the application tables. This was inspected in the committed migrations; current cloud state cannot be asserted without an approved non-production database connection.
* The production Caddy/systemd kit runs the Next standalone server as the unprivileged `haydevos` user on `127.0.0.1:3000`, behind Caddy. It includes backup and readiness units. Its presence is source evidence only, not evidence of a live VPS.
* `next.config.ts` applies CSP, frame denial, HSTS and other browser headers. The home-page orbit/WebGL architecture has not been changed.
* Local `/api/health` returned HTTP 200. `/api/ready` returned HTTP 500 because the local machine has no runtime `DATABASE_URL` and no configured malware scanner; `getMalwareScanner()` throws before the readiness route's bounded probe wrapper can turn that expected configuration absence into `not_ready`. This is an existing baseline defect, not an OpenClaw change.

## OpenClaw baseline

The host has a user-level `openclaw` CLI, version `2026.8.1`, and a shared `C:\Users\Admin\.openclaw` state directory. It is outside this repository and may belong to the separate Jarvis application. It is therefore treated as **out of scope**: HayDevOS will not read, reconfigure, pair with, or reuse that state, token, memory, session, service or Gateway.

No live HayDevOS-owned Gateway, broker process, token, or OpenClaw-specific runtime environment setting exists locally. This implementation adds a source-only broker, a distinct `haydev-openclaw` systemd-account/unit template and commented configuration placeholders; none has been installed or enabled. The exact remote/VPS installation state is unknown. The current project is structurally multi-tenant (`Organization`, `Membership`, `Session`, organization-scoped domain models), while runtime tenant count cannot be verified without approved database access.

OpenClaw's current documentation requires Node 24.16+ or Node 26.1+; Node 24.18.0 satisfies the Node floor. The same documentation says the OpenAI-compatible HTTP endpoint is disabled by default and that a Gateway operator token is a trusted control-plane credential, not a tenant credential. Consequently this application must never use a browser-facing or public `/api` proxy to a raw Gateway.

## Credential inventory

Only `.env.example` is present locally. It documents placeholders but proves no configured credential. The following are therefore `NOT_CONFIGURED_LOCAL`: database, Supabase Storage, malware scanner, Owner AI provider, HayDevOS-owned OpenClaw broker, Meta/WhatsApp/Instagram/Facebook accounts and OAuth/webhook secrets. Values were neither read nor logged.

## Reproducible checks

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run lint` | PASS | ESLint exited 0 |
| `npm run typecheck` | PASS | `tsc --noEmit` exited 0 |
| `npm run i18n:check` | PASS | 2,650 keys in each HY/RU/EN catalog; 0 missing/extra |
| `npm run test:security-structure` | PASS | 19 tests passed |
| `npm run test:malware` | PASS | 6 tests passed |
| `npm run test:documentflow` | PASS | 7 tests passed |
| `npm run test:sla` | PASS | 5 tests passed |
| `npm run test:quoteflow-pricing` | PASS | 5 tests passed |
| `npm run build` | PASS | Prisma generation and Next production build completed |
| `npm run test:security-integration` | BLOCKED | deliberately requires `HAYDEV_TEST_DATABASE_URL` plus its explicit isolation confirmation; it never mutates `DATABASE_URL` |

## Initial risk map and rollback

| Risk | Status | Required control |
| --- | --- | --- |
| Raw Gateway token used as tenant authorization | Open | dedicated server-only broker with signed protocol, allowlisted behavior and local domain authorization |
| Shared Gateway across unrelated organizations | Open | do not enable until a separate process/state/OS user or host exists for each trust boundary |
| Prompt injection from inbound channels/documents | Open | untrusted-content labeling, restricted public worker and no shell/browser/domain-write tools |
| Existing mock integration screens represented as live | Confirmed | retain explicit `NOT_CONFIGURED`/blocked state until server-backed provider paths exist |
| Missing local health dependencies | Confirmed | configure a non-production environment before readiness or integration verification |

This baseline makes no schema, data, provider, deployment or account change. Rollback is deletion of the documentation added by this work; no runtime state needs restoration.
