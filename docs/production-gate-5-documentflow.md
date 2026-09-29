# HAYDEVOS PRODUCTION GATE #5
## DOCUMENTFLOW + SUPABASE STORAGE REPORT

Date: 2026-09-25

Verdict: **PASS for implementation, linked Supabase schema, and private Storage integration. CONDITIONAL for live application cutover** because deployment secrets/HTTPS rollout and a real malware scanner are operational steps outside this repository. Without a scanner, user uploads correctly remain unavailable as `PENDING_SCAN`.

## Delivered architecture

- PostgreSQL is authoritative for logical documents, immutable versions, generation attempts, templates, access events, quote bindings, hashes, status, and audit.
- Private Supabase Storage is authoritative for bytes. The browser never receives the privileged key or chooses a bucket/key.
- HayDevOS opaque sessions, active membership, tenant scope, RBAC, same-origin checks, and strict request schemas guard every application operation.
- Uploaded and generated artifacts use a compensating two-phase workflow with read-back size/SHA-256 verification.
- Quote PDF/DOCX/JSON artifacts use one canonical immutable QuoteVersion model; PDF embeds Unicode fonts for Armenian/Russian/English.
- Owner AI uses DocumentService for reads/generation/archive and cannot call Storage directly.

## Supabase rollout evidence

Project: `rljeqbffppqfxkwcptgs` (`HAYDEVOS`). Preflight was 0 organizations, 0 users, 0 documents, 0 generated quote documents, 0 buckets, and 7 finished migrations.

Migration: `20260925110000_documentflow_production_domain`.

SHA-256: `cdd0a25da8b46283d757c6214decc613838fc427e80b62c20c7f24fa9587105f`.

Postflight: ledger match 1; private bucket match 1; 6/6 document tables have RLS; browser document grants 0; runtime grants 24; tenant FK checks 5; document security triggers 6; `haydev_runtime` has no elevated privilege. `supabase db lint --linked --level warning` returned no schema errors.

Bucket `haydev-documents` is private, has a 25 MB file limit, and has the committed MIME allowlist. A live Storage smoke test passed private upload, SHA-256 round-trip, signed access, public-path denial, publishable-client denial, and cleanup. Final reconciliation reported 0 metadata versions, 0 objects, and no missing/mismatched/orphan objects.

The current modern secret key returned `Invalid Compact JWS` from hosted Storage; the still-active legacy service-role JWT worked. No key was persisted. This compatibility exception must be retested and rotated when the provider path supports the modern key for this project.

## Security and validation

- Exactly one multipart file per request; request/file limits are enforced server-side.
- Allowed: PDF, DOCX, XLSX, CSV, TXT, PNG, JPEG.
- Extension, declared MIME, magic bytes, UTF-8/no-NUL text, and OOXML required-part checks run before upload.
- Object keys contain server-derived organization/document/version IDs and sanitized filenames; `upsert` is false.
- Normal APIs omit Storage bucket/key. Signed URLs expire in 30–300 seconds (default 60) and require released status.
- User uploads cannot download before a trusted scanner verdict; no fake `CLEAN` path exists.
- Database triggers reject cross-tenant sources/versions/access events and protect immutable history under the runtime role.

## Verification completed

- Prisma validate/generate and schema diff against a fresh PostgreSQL 17 database: no difference.
- Exact migration fresh-apply: PASS.
- Document renderer/validation suite: 7/7 PASS, including Armenian/Russian/English PDF, DOCX value fidelity, executable/OOXML rejection, and filename sanitization.
- PostgreSQL tenant suite: PASS, including document source/version/access isolation and runtime immutability.
- Production standalone HTTP suite: PASS for unauthenticated denial, real private upload, quarantine, strict metadata, PDF/DOCX generation, 8-way generation race, idempotent retry, artifact history, signed download, DTO path non-disclosure, organization switch, and cross-tenant metadata/download/generation denial.
- Production Next.js build: PASS; Unicode font files are present in standalone output.
- Supabase Storage smoke and post-test reconciliation: PASS; all test objects were removed (16 Gate 5 objects plus 1 QuoteFlow regression artifact), leaving 0 objects.

## Files and modules

Core implementation: `src/lib/documents/*`, `src/lib/storage/*`, `src/app/api/documents/**/*`, QuoteFlow document routes/UI, Owner AI route/tools/executor, Prisma schema/migration, Storage provisioning/smoke/reconciliation scripts, and DocumentFlow production UI/API.

Verification: `tests/documentflow-artifacts.test.ts`, `tests/documentflow-production.mjs`, and expanded `tests/postgres-tenant-isolation.mjs`.

Runbooks: audit, this report, `documentflow-production.md`, production security, storage architecture, and coordinated database/object backup/restore.

## Cutover requirements

1. Add the server-only Storage credential, URL, bucket, and TTL to the deployment secret manager. For this linked project, use the verified legacy service-role key only as a temporary compatibility exception; never expose it to the browser.
2. Deploy the exact build over HTTPS with exact `APP_ORIGINS`, pooled `haydev_runtime` database URL, and no `DIRECT_URL` in runtime.
3. Connect a real scanner worker to `recordMalwareScanResult` before enabling user-upload downloads. Until then, quarantine behavior is the correct production behavior.
4. Configure coordinated PostgreSQL + bucket backups and complete an isolated restore drill.
5. Run the HTTP, org-switch, Owner AI, Storage smoke/reconciliation, and prior Gate #1–#4 suites against the deployed URL; monitor 5xx, integrity, scan backlog, access denials, and reconciliation drift.

## Rollback

Prefer application rollback plus a forward corrective migration. Never drop immutable document/version/access/generation history after real use and never overwrite an existing object key. Before any restore, quiesce writers and restore PostgreSQL plus Storage to one verified checkpoint. An orphan or hash mismatch is quarantined for investigation, not automatically deleted.
