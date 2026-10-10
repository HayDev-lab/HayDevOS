# Competitor monitoring

HayDevOS now provides a tenant-scoped monitor for up to five public HTTPS
sources. It runs a bounded HTTP fetch without a browser or GPU, stores only
normalized text, hashes and metadata, and produces a report every three days
by default.

## Supported sources

- Server-rendered HTML pages
- RSS/Atom feeds
- XML sitemaps
- JSON endpoints that return public data

JavaScript-only sites are intentionally not scraped with stealth browsers or
anti-bot bypasses. Configure the competitor's RSS/API/sitemap URL instead, or
add a reviewed external fetcher later.

## Safety boundaries

- HTTPS is required.
- Local, private and metadata hosts are rejected, including redirects.
- Response bodies are bounded to 1.5 MB and requests time out after 12 seconds.
- At most five monitors are allowed per tenant.
- No cookies, credentials, raw HTML or browser sessions are persisted.
- Each monitor has a lease to prevent overlapping cron runs.
- Reports are deterministic and marked `local-heuristic`; an LLM is not
  required and no local GPU is used.

## Scheduling

`vercel.json` calls `/api/cron/competitor-monitor` daily at 05:00 UTC. The
route is protected by `CRON_SECRET` (or `HAYDEV_CRON_SECRET`), while each
monitor's `nextCheckAt` enforces its three-day cadence. The same operation can
be started manually from Marketing → Competitor monitoring.

Before enabling the production cron, add the server-only secret in the
deployment environment and apply the committed Prisma migration:

```text
20261010130000_competitor_monitoring
```

The migration must be applied through the normal production database runbook;
do not claim persistent monitoring until the migration and one real run are
verified.
