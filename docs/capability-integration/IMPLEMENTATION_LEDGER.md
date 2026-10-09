# HayDevOS capability integration ledger

This is the single durable ledger required by `docs/prompt-pack-capability-integration.md`. It records observed evidence; it is not a substitute for code, runtime, security, or release verification.

## Phase 00 — Source of truth and safe baseline

**Observed:** 2026-10-09 (Asia/Yerevan)  
**Status:** BLOCKED  
**Scope:** read-only source inventory and local verification; no product code, Git index, remote, database, Storage, deployment, or external account was changed.

### Input identity

- Workspace: `D:\Projects\HayDev\HayDevOSv1`
- Requested pack and repository copy have the same SHA-256: `4B88E8597743614F695C680FEC2FF9259FB329973A82291A6483AB983AD1004D`.
- Pack: `docs/prompt-pack-capability-integration.md`
- Existing cleanup pack: `docs/prompt-pack-post-production-cleanup.md`

### Git source evidence

| Item | Observed value | Interpretation |
|---|---|---|
| Current branch | `codex/fix-quoteflow-session` | Local working branch |
| HEAD | `05fd4716f20a50d00487bffc61bd0cdd1a9f69f4` | `fix: recover expired sessions in LeadOS and QuoteFlow` |
| Local `main` | `27ff2ead6dff9ac8a089b4d11c052a280eab3f64` | Merge-base of local `main` and HEAD |
| `origin` | `https://github.com/HayDev-lab/HayDevOS.git` | Fetch/push remote |
| `origin/main` | `19dbe1ed3450b18d055cf1cd520cc783da846e15` | Remote-tracking tip available locally |
| `merge-base HEAD origin/main` | none, exit `1` | Histories are unrelated in the available repository graph |
| `HEAD...origin/main` | 5 local / 35 remote-only commits | This count does not make a merge safe when no merge-base exists |
| Release `5171b40` ancestor of HEAD | yes | The previously documented Vercel release line is contained in the local line |
| Release `5171b40` ancestor of `origin/main` | no | Remote main is a different lineage |

No tag was returned by the local tag inventory.

### Dirty worktree evidence

- 188 tracked paths differ from HEAD: 69 modified and 119 deleted.
- Diff summary: 1,320 insertions and 30,070 deletions.
- Four untracked entries were observed:
  - `docs/prompt-pack-capability-integration.md`
  - `docs/prompt-pack-post-production-cleanup.md`
  - `haydev_marketing_webgl/`
  - `src/app/api/documents/upload/`
- The changes include application code, API routes, tests, deployment documentation, build scripts and large module/UI deletions. Their ownership and intended release boundary cannot be inferred safely.
- These changes were preserved. No reset, checkout, clean, stash, rebase, merge, commit or push was performed.

### Resolved runtime/toolchain

| Component | Observed version |
|---|---:|
| Node.js | `24.18.0` |
| npm | `11.16.0` |
| Next.js | `16.3.5` |
| React | `19.3.0` |
| Prisma CLI | `6.19.3` |
| `@prisma/client` | `6.19.3` |
| Bun used by tests | `1.3.14` |

The `package.json` ranges are not the resolved versions. All future Next.js changes must follow the installed-version documentation under `node_modules/next/dist/docs/`, as required by `AGENTS.md`.

### Existing extension points

| Capability | Existing source of truth | Observed gap/boundary |
|---|---|---|
| Auth and tenant boundary | `src/lib/auth/*`, `src/lib/api/handler.ts`, `withTenantApi` | Custom DB-backed auth must remain authoritative; 65 of 70 route files currently reference the canonical wrapper, with public/auth classification requiring route-by-route review |
| Dashboard | `src/components/shell/DashboardView.tsx`, domain overview APIs | Production component imports `@/lib/mock` KPI/leads/documents/automations/integrations |
| Control | `src/modules/control/adapters.ts`, `src/modules/control/data.ts`, existing domain APIs | Typed adapters exist, but mock-derived concepts and data remain |
| Business Audit | Prisma `AuditQuestionnaire`; `src/modules/audit/*` | Persistence model exists; no dedicated audit route was discovered; UI still exposes current/demo concepts |
| Owner AI | `/api/owner-ai`, approval/state routes, `src/app/api/owner-ai/audit.ts`, domain action sinks | Persistent/audited tools exist, but truthfulness and mock/disabled tool coverage still require a dedicated phase |
| Automation | Prisma `Automation`/`AutomationRun`; `src/lib/automations/executor.ts`; LeadOS/QuoteFlow/ERP executors | Domain execution core exists; no automation API route was discovered; UI/data layer remains separate/mock-oriented |
| Integrations | Prisma `Integration`/`WebhookEvent`; `src/modules/integrations/*` | No integration/webhook API route was discovered; UI includes mock types and an in-memory-style credentials concept |
| Documents | Prisma `DocumentRecord`/`DocumentVersion`/`DocumentField`; `src/lib/documents/*`; six document route surfaces including untracked upload route | Secure document domain exists; extraction/review must extend it, never replace it |

### Local verification evidence

| Check | Result | Evidence/qualification |
|---|---|---|
| `npm run typecheck` | PASS | Exit 0 |
| `npm run lint` | PASS | Exit 0 |
| `npm run i18n:check` | PASS | 2,649 keys each for en/hy/ru; no duplicates, missing, extra or unknown literal keys |
| `npm run build` | PASS | Prisma generation and Next.js 16.3.5 production build completed; route manifest generated; exit 0 |
| Security structure suite | WARN, not a clean single-run PASS | First parallel run: 18 pass, 1 timeout on Owner AI authorization. Isolated rerun of that file: 3 pass in 584 ms. Treat as a harness-stability signal, not a proven authorization failure or a clean deterministic suite |
| LeadOS SLA unit tests | PASS | 5 pass |
| QuoteFlow pricing unit tests | PASS | 5 pass |
| DocumentFlow artifact/validation tests | PASS | 7 pass |
| Malware adapter tests | PASS | 6 pass |
| ERP automation suite | NOT_RUN as a valid integration suite | 1 pure RBAC case passed; DB-backed cases failed because `DATABASE_URL` is absent. No product failure or PASS is claimed |
| Other DB-mutating suites | NOT_RUN | No isolated `HAYDEV_TEST_DATABASE_URL` and confirmation marker were supplied; production DB was not used |
| Live production smoke | NOT_RUN | Phase 00 is local/read-only and no production mutation or credential use was authorized |

### Current production dependency audit

`npm audit --omit=dev --json` completed against the npm advisory endpoint and returned exit `1` with three production vulnerabilities:

| Package | Severity | Observed affected range | Key advisory evidence |
|---|---|---|---|
| `next@16.3.5` | critical (also high/moderate/low advisories) | aggregate `16.0.0 - 16.3.7` | Critical ImageResponse RCE affects `>=16.2.0 <16.3.6`; additional fixes require at least a version outside `<16.3.8` ranges |
| `sharp` nested under Next | high | `<0.35.5` | librsvg dependency vulnerability |
| `source-map-js` | high | `>=1.0.0 <1.2.2` | event-loop denial of service |

Metadata: 1 critical, 2 high, 3 total production vulnerabilities. `fixAvailable=true` was reported for all three. No automatic fix was run. The older Gate 7 statement of zero vulnerabilities is stale for the currently resolved dependency graph.

### Blocking decision

Prompt 00 cannot be marked PASS because both mandatory source conditions fail:

1. `HEAD` and `origin/main` have no merge-base.
2. The worktree contains large, overlapping, unattributed product changes and deletions that cannot be separated safely from new capability work.

Prompt 01 and all later implementation phases must not begin until the owner selects and documents the canonical source line and ownership of the dirty changes. The next safe action is a reviewed lineage/recovery decision, not a dependency update, merge, force-push or feature edit.

### Required owner decision for the next gate

Choose which code line is authoritative:

- preserve the current local `05fd471` line plus its dirty work as the product source, then reconcile it into a separately reviewed migration branch based on `origin/main`; or
- treat `origin/main` as authoritative and migrate only explicitly selected local changes into a separate clean worktree/branch.

No option should overwrite or discard the current working directory. Before implementation, the owner must also confirm whether the 119 deletions and the untracked `haydev_marketing_webgl/` tree are intentional.

### Rollback

No product or Git mutation occurred. This phase added only this ledger and `UPSTREAMS.lock.md`; removing those two new documentation files would revert the phase without touching user work.

## Phase 00 continuation — owner selected `origin/main`

**Observed:** 2026-10-09 (Asia/Yerevan)  
**Owner decision:** `origin/main` is the canonical source line.  
**Status:** BLOCKED pending a migration-scope gate; the original dirty worktree remains preserved.

### Safe worktree preparation

- A separate worktree was created at `D:\Projects\HayDev\HayDevOSv1-origin-main`.
- Branch: `codex/capability-integration`.
- Start commit: cached remote-tracking commit `19dbe1ed3450b18d055cf1cd520cc783da846e15`.
- The branch tracks `origin/main`.
- `git fetch origin main` failed with `Repository not found`; therefore the current remote tip could not be refreshed or authenticated. The exact cached commit is known, but its freshness is not proven.
- The original `D:\Projects\HayDev\HayDevOSv1` worktree, its 188 tracked changes and four untracked entries were not modified, staged, stashed, reset or merged.

### Windows mode-only status diagnosis

The new worktree initially appeared to contain 472 modified paths. Read-only diff inspection proved these were mode-only changes:

- repository/index mode: `100755` for ordinary files;
- Windows worktree mode: `100644`;
- `git diff --stat`: zero text insertions/deletions; binary sizes unchanged;
- `git diff --ignore-space-at-eol`: still mode-only;
- the shared repository has `core.filemode=true`, while the system Git config has `core.filemode=false`.

No content was changed. Until repository mode metadata is deliberately normalized in a reviewed change, status checks for this Windows worktree must use `git -c core.filemode=false status`. The shared config was not changed automatically.

### Canonical-line architecture mismatch

Fresh read-only inspection shows that cached `origin/main` is not the production-oriented HayDevOS architecture described earlier in this ledger:

| Area | Cached `origin/main` at `19dbe1e` | Local `05fd471` line |
|---|---|---|
| Product shape | Marketing site plus in-page LeadOS demo | Multi-module HayDevOS application |
| Persistence | Tracked SQLite `db/custom.db`; Prisma `Ld*` demo/domain models | PostgreSQL/Supabase-oriented multi-domain schema |
| Identity | Demo cookie context with fallback demo user; `next-auth` is only a dependency inventory fact | Custom DB-backed sessions, memberships, RBAC and tenant wrapper |
| Implemented domains | LeadOS, business-audit API, webhook endpoints, marketing/demo surfaces | LeadOS, QuoteFlow, DocumentFlow, ERP, Owner AI, automation executors and production operations |
| Automation core | No `Automation`/`AutomationRun` models or canonical executor discovered | Existing Prisma models and LeadOS/QuoteFlow/ERP executors |
| Document domain | No `DocumentRecord`/`DocumentVersion`/`DocumentField` domain discovered | Existing secure document lifecycle and storage adapter |
| Integration domain | LeadOS-specific integration sync/event/webhook models | Generic `Integration`/`WebhookEvent` plus UI scaffolding |
| Repository operations | Bun lock, no `package-lock.json`; POSIX-style scripts; no `docs/` or `AGENTS.md` discovered | npm lock, production documentation and Next.js agent rules |

Additional source risks on cached `origin/main`:

- `.env` is tracked. Its values were not printed or copied; it requires a dedicated secret/history assessment before any migration or publication.
- `db/custom.db` is tracked and must be treated as potentially containing data until inspected safely.
- Demo behavior is explicit in the source: demo cookie fallback, synthetic seed/reset, local mock ERP adapter, localStorage audit drafts and marketing Mission Control demo data.

### Revised gate

The existing capability pack was authored against the local multi-module architecture. Applying it unchanged to `origin/main` would violate its own no-duplication rule because the assumed extension points do not exist there.

Before Prompt 01, create a reviewed migration matrix with three decisions for every capability/file group:

1. **KEEP** — existing `origin/main` marketing/LeadOS implementation remains authoritative.
2. **MIGRATE** — port a bounded production capability from the local line by behavior and tests, not by blind merge/cherry-pick.
3. **DROP/ARCHIVE** — do not carry demo data, runtime artifacts, tracked secrets/databases, obsolete screenshots/tool outputs or duplicate UI/domain layers.

The first migration slice must be foundation only: repository hygiene, secrets/data removal plan, package manager/build portability, production auth/tenant boundary and PostgreSQL schema strategy. QuoteFlow, DocumentFlow, ERP, Owner AI, automation and external upstreams remain blocked until that foundation passes.

### Next safe action

Perform a read-only cross-line migration inventory and rewrite `docs/prompt-pack-capability-integration.md` for the actual `origin/main` architecture. Do not merge unrelated histories and do not copy the complete local `src/`, `prisma/`, `package.json` or lockfile over `origin/main`.
