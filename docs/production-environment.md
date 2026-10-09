# Production environment contract

Install values only in the hosting provider's encrypted secret/configuration store. Never paste values into tickets, chat, shell history, CI logs, GitHub Actions YAML, or committed files. `.env.example` is the canonical name list and contains placeholders only.

## Core runtime

| Variable | Required | Purpose and validation |
| --- | --- | --- |
| `NODE_ENV` | yes | Must be `production` at runtime. |
| `PORT` | yes | Internal Node listener, normally `3000`. |
| `HAYDEV_DOMAIN` | yes on Caddy | Exact public hostname used for automatic HTTPS. |
| `DATABASE_URL` | yes | Session-pooler PostgreSQL URL for the least-privilege `haydev_runtime` role. Server-only. |
| `DIRECT_URL` | deploy job only | Migration-owner/session connection. Do not install in the normal web runtime when the platform permits separate job secrets. |
| `APP_ORIGINS` | yes | Comma-separated exact canonical HTTPS origins. Wildcards, paths, HTTP, and suffix matching are rejected. |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | before Server Actions | One stable 32-byte base64 key shared by all instances. |
| `HAYDEV_RELEASE` or `RELEASE_SHA` | recommended | Immutable release identifier included in structured logs. |
| `HAYDEV_ENVIRONMENT` | recommended | Environment label such as `production`. |

`DATABASE_URL` and `DIRECT_URL` must use different roles. The runtime role is verified as `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`. Keep the pool small and use the Supabase session pooler for a long-running standalone process.

## Private Supabase Storage

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | yes | `https://<project-ref>.supabase.co`. |
| `SUPABASE_SECRET_KEY` | yes | Modern opaque `sb_secret_...`; server-only. |
| `SUPABASE_STORAGE_AUTH_JWT` | temporary compatibility only | Legacy compact service-role JWT used only as the Storage `Authorization` header when the hosted Storage path rejects the opaque key. |
| `HAYDEV_DOCUMENT_BUCKET` | yes | Private document bucket, normally `haydev-documents`. |
| `HAYDEV_DOCUMENT_SIGNED_URL_TTL_SECONDS` | recommended | Short signed-download TTL; default/target 60 seconds. |

`SUPABASE_STORAGE_AUTH_JWT` requires explicit risk acceptance, must remain server-only, is validated as a compact JWT, and emits a structured startup warning. Keep `SUPABASE_SECRET_KEY` as the modern `apikey`; never treat `sb_secret_` itself as a JWT. Readiness performs an authenticated bucket listing so a metadata-only health check cannot hide a broken object path. Retest the modern key regularly and remove the compatibility JWT as soon as the provider path accepts it.

## Malware scanner

| Variable | Required | Purpose |
| --- | --- | --- |
| `MALWARE_SCANNER_PROVIDER` | yes | Exactly `metadefender`. |
| `METADEFENDER_API_KEY` | yes | Server-only API key. |
| `MALWARE_SCANNER_TIMEOUT_MS` | optional | Overall scan deadline; default 60000. |
| `MALWARE_SCANNER_RETRIES` | optional | Transient retry count, capped at 3. |
| `METADEFENDER_BASE_URL` | optional | Override only for an approved provider endpoint. |

The integration sets private/no-sharing mode, verifies the returned SHA-256, and accepts only a completed result with at least one engine and zero detections.

## Owner AI

| Variable | Required for Owner AI | Purpose |
| --- | --- | --- |
| `OWNER_AI_BASE_URL` | yes | HTTPS OpenAI-compatible API base. |
| `OWNER_AI_API_KEY` | yes | Server-only provider credential. |
| `OWNER_AI_MODEL` | yes | Approved model identifier. |
| `OWNER_AI_TIMEOUT_MS` | optional | Bounded provider deadline. |

Owner AI is not required for core startup. In production it never falls back to synthetic responses; provider failure returns a controlled error and is logged.

## Monitoring

| Variable | Required | Purpose |
| --- | --- | --- |
| `ERROR_WEBHOOK_URL` | recommended | HTTPS ingestion endpoint for sanitized server errors. |

The sink must alert on readiness failure, repeated 5xx responses, authentication throttling, scanner errors, failed backups, RLS/policy drift, and reconciliation failures. Logs must not include cookies, session tokens, passwords, request bodies, document content, database URLs, API keys, or authorization headers.

## One-time bootstrap

`HAYDEV_BOOTSTRAP_EMAIL`, `HAYDEV_BOOTSTRAP_NAME`, `HAYDEV_BOOTSTRAP_PASSWORD`, `HAYDEV_BOOTSTRAP_ORG_NAME`, and `HAYDEV_BOOTSTRAP_ORG_SLUG` are installed only in a one-off protected job. Run `npm run auth:bootstrap`, verify OWNER membership, then remove every bootstrap variable before starting or redeploying the web runtime. A rerun does not change credentials or roles.

## Smoke and recovery jobs

- Smoke credentials: `BASE_URL`, `PRODUCTION_SMOKE_EMAIL`, `PRODUCTION_SMOKE_PASSWORD`, `PRODUCTION_SMOKE_ORG_SLUG`; optional cross-tenant object ID and explicit mutation flags.
- Database-mutating test suites: `HAYDEV_TEST_DATABASE_URL` plus `HAYDEV_TEST_DATABASE_CONFIRM=HAYDEVOS_ISOLATED_TEST_DATABASE`. The runner refuses to reuse the local production database identity.
- Backup: `BACKUP_DIR`, `BACKUP_DESTINATION_CONFIRMED_ENCRYPTED=YES`, plus migration and Storage credentials.
- Restore: `BACKUP_MANIFEST`, `RESTORE_DATABASE_URL`, `RESTORE_CONFIRM_ISOLATED=HAYDEVOS_RESTORE_DRILL`, and an isolated `HAYDEV_RESTORE_BUCKET`.

These job-only secrets must not be installed in the public web process after use.
