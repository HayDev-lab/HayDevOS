# DocumentFlow production architecture

DocumentFlow stores business metadata in PostgreSQL and immutable bytes in one private Supabase Storage bucket. HayDevOS custom sessions remain the identity and authorization system; Supabase Auth is not used for application users.

## Trust boundary

The browser can call only authenticated Next.js route handlers. `withTenantApi` resolves the opaque session, current membership, active organization, and role. Mutation routes enforce same-origin requests. The client cannot submit an organization ID, storage bucket, object key, hash, scan verdict, status, actor, quote totals, or template identity.

The server-only Storage adapter is the only production component that holds the Supabase secret. No `NEXT_PUBLIC_*` variable contains a privileged key. Storage objects are private and no `anon` or `authenticated` object policy grants access.

## Data model

- `DocumentRecord` is the logical tenant document and current-version pointer.
- `DocumentVersion` is immutable file evidence: bucket, server-generated key, filename, detected MIME, size, byte SHA-256, version number, scan state, template/locale, source snapshot, and failure metadata.
- `DocumentTemplate` versions the renderer identity and definition metadata.
- `DocumentGeneration` records each PDF/DOCX/JSON generation attempt and its immutable QuoteVersion source.
- `DocumentAccessEvent` is append-only access/generation/upload/scan evidence.
- `GeneratedQuoteDocument` binds a QuoteVersion to exactly one stored DocumentVersion for a format, template version, and locale.

Composite foreign keys and triggers reject cross-tenant sources, document/version mismatches, non-member actors, invalid current-version pointers, and runtime mutation of final history. RLS is enabled and browser database roles have no application table grants.

## Object layout and lifecycle

The server generates every key:

`organizations/{orgId}/documents/{documentId}/versions/{versionId}/{sanitizedFilename}`

Uploads use `upsert: false`, so a version can never overwrite prior bytes. The server validates the extension, declared MIME, and magic/OOXML structure, enforces 25 MB in both the HTTP handler and bucket, sanitizes names, calculates SHA-256, uploads, reads the object back, and verifies size/hash before finalizing metadata.

Metadata preparation and object upload are intentionally two-phase. A failed object operation is compensated by deleting the new object when possible and finalizing the attempt as failed. `npm run storage:reconcile -- --hash` reports missing objects, size/hash mismatches, and orphan objects; it never deletes anything.

Uploaded files remain `PENDING_SCAN` and cannot be downloaded. `recordMalwareScanResult` is the trusted worker hook for a real scanner. It requires the immutable byte hash and accepts only `CLEAN`, `INFECTED`, or `SCAN_FAILED`; no browser route exposes it. No scanner is configured in this repository, so uploads are never falsely marked clean.

Server-generated quote artifacts use `NOT_REQUIRED` because their bytes are produced inside the trusted renderer from persisted data rather than supplied by a user.

## Quote artifacts

PDF, DOCX, and JSON use one canonical `QuoteDocumentModel` built exclusively from `QuoteVersion.customerSnapshot`, `itemsSnapshot`, authoritative Decimal totals, dates, terms, notes, and template version. No renderer recalculates money and later quote/catalog edits cannot change an existing artifact.

PDF embeds DejaVu Sans regular/bold fonts for Armenian, Russian, and English. DOCX and PDF carry the same line and total values. Idempotency is the tuple `(quoteVersionId, format, templateVersion, locale)`. A PostgreSQL advisory lock plus bounded serializable retry prevents duplicate artifacts during races; an in-progress duplicate returns 409 and a completed retry returns the existing identity.

## API surface

- `GET /api/documents` — bounded tenant list/search/filter.
- `POST /api/documents/upload` — one multipart file plus strict JSON metadata.
- `GET /api/documents/:id` and `/versions` — tenant-scoped metadata/history.
- `GET /api/documents/:id/download` — status/scan check, audit, then a 30–300 second signed redirect.
- `POST /api/documents/:id/archive` — manager/admin/owner logical archive.
- `POST /api/quoteflow/quotes/:id/document` — immutable quote artifact generation.
- `GET /api/quoteflow/quotes/:id/documents` — immutable artifact history.

Normal DTOs never return `storageBucket` or `storageKey`. Download URLs are created only after session, tenant, RBAC, document/version ownership, and release-state checks.

## Owner AI

Owner AI reads summaries, search results, document metadata/version history, and quote artifact history through DocumentService. Its safe `generateQuoteDocument` action calls the same generation service. Document archive remains risky, requires a persisted approval, and calls DocumentService. Owner AI has no Storage adapter, raw SQL, or arbitrary path access.

## Deployment configuration

Required server secrets:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `HAYDEV_DOCUMENT_BUCKET=haydev-documents`
- `HAYDEV_DOCUMENT_SIGNED_URL_TTL_SECONDS=60`

On 2026-09-25, the linked project's modern `sb_secret_...` key returned `Invalid Compact JWS` from the hosted Storage endpoint even though current Supabase guidance recommends it. The legacy `service_role` JWT succeeded and was used for the verified rollout/smoke test. Treat this as a temporary provider compatibility exception: keep it server-only, monitor Supabase resolution, retest the modern key, then rotate away from the legacy key. No key is stored in the repository.

Provision with `npm run storage:configure`; verify with `npm run storage:smoke` and `npm run storage:reconcile -- --hash` from a trusted runner. See `docs/storage-backup-restore.md` before enabling production writes.

## Monitoring

Alert on Storage 4xx/5xx, object integrity failures, compensation cleanup failures, long-lived `UPLOADING`/`GENERATING`/`PENDING_SCAN` rows, scan failures, 409 generation spikes, denied cross-tenant access, signed-download failures, and reconciliation drift. Never log keys, signed URLs, session cookies, file contents, or privileged Supabase credentials.
