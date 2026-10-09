# Supabase Edge export handoff

LeadOS export is now prepared for an asynchronous Supabase Edge worker.

## Flow

1. Authenticated `POST /api/leados/export` creates an `ExportJob` in the
   tenant's PostgreSQL scope and returns a one-time token.
2. The browser invokes `leados-export` directly on Supabase Edge.
3. The worker claims the job atomically, reads only non-archived leads for the
   claimed organization, writes a CSV to the private document bucket, and
   marks the job `SUCCEEDED`.
4. The browser polls `GET /api/leados/export/{jobId}` through the normal HayDevOS
   session boundary. Next.js creates a short-lived signed Storage URL.

The existing synchronous GET export remains as a compatibility path until the
Edge function is deployed and `SUPABASE_EDGE_EXPORT_URL` is configured.

## Current activation state

The additive `ExportJob` migration is applied to project
`rljeqbffppqfxkwcptgs`, including the Prisma migration record, RLS policy,
runtime grants, and membership trigger. The `leados-export` Edge Function is
deployed as version 1 with custom one-time-token authentication. It remains
configuration-gated until the secrets below are set and
`SUPABASE_EDGE_EXPORT_URL` is added to the Next.js deployment.

## Edge secrets

Set these in the Supabase project, not in the browser and not in the Next.js
runtime:

- `HAYDEV_EDGE_DATABASE_URL`: the restricted `haydev_runtime` transaction
  pooler URL (`6543`, `sslmode=require`, prepared statements disabled by the
  worker). Do not use `DIRECT_URL` or a schema-owner password.
- `HAYDEV_EDGE_STORAGE_KEY`: a server-only Supabase Storage secret capable of
  writing the private `HAYDEV_DOCUMENT_BUCKET` bucket.
- Optional `HAYDEV_EDGE_STORAGE_AUTH_JWT`: legacy compact service-role JWT only
  if the Storage deployment still requires an `Authorization` header. Do not
  put the opaque `sb_secret_...` key in that header.
- `HAYDEV_DOCUMENT_BUCKET`: normally `haydev-documents`.
- `HAYDEV_EDGE_ALLOWED_ORIGINS`: comma-separated exact HTTPS origins for the
  HayDevOS browser, for example `https://app.example.com`.

Deploy with:

```powershell
supabase functions deploy leados-export --use-api
```

Then set the returned function URL as `SUPABASE_EDGE_EXPORT_URL` in the Next.js
deployment and restart the application. Before activation, apply the Prisma
migration and run the normal tenant-isolation/security suites against an
isolated PostgreSQL database.

The worker caps a single export at 100,000 leads and 25 MiB. Larger exports
should become a paged object/upload job rather than increasing Edge memory.
