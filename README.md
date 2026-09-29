# HayDevOS

HayDevOS is a Next.js 16 multi-tenant application with custom database-backed authentication, membership RBAC, tenant-scoped Owner AI persistence/actions, and Prisma on PostgreSQL.

## Local commands

```powershell
npm ci
npm run db:generate
npm run db:deploy
npm run dev
```

`DATABASE_URL` must be a server-side PostgreSQL URL. `DIRECT_URL` is used only by Prisma migrations and the SQLite cutover tool. Copy `.env.example` to an ignored local env file and replace placeholders; never commit database passwords.

Useful checks:

```powershell
npm run db:check
npm test
npm run test:postgres-isolation
npm run test:leados
npm run test:leados-org-switch
npm run test:quoteflow-pricing
npm run test:quoteflow
npm run test:quoteflow-org-switch
npm run test:owner-ai-quoteflow
npm run test:documentflow
npm run test:documentflow:http
npm run test:erp-automation
npm run test:erp
npm run test:owner-ai-erp
npm run test:erp-restart
npm run db:verify:inventory
npm run db:verify:erp-finance
npx supabase db query --linked --file scripts/supabase-postgres-15-19-preflight.sql --output json
npm run storage:configure
npm run storage:smoke
npm run storage:reconcile -- --hash
npm run lint
npx tsc --noEmit
npm run build
```

## Production

Start with [MIGRATION_AUDIT.md](MIGRATION_AUDIT.md), then follow:

- [Supabase cutover](docs/supabase-cutover.md)
- [Storage architecture](docs/storage-architecture.md)
- [Backup and restore](docs/database-backup-restore.md)
- [Production security](docs/production-security.md)
- [LeadOS production architecture](docs/leados-production.md)
- [Production Gate #3 evidence](docs/production-gate-3-leados.md)
- [QuoteFlow production architecture](docs/quoteflow-production.md)
- [Production Gate #4 evidence](docs/production-gate-4-quoteflow.md)
- [DocumentFlow production architecture](docs/documentflow-production.md)
- [Document Storage backup and restore](docs/storage-backup-restore.md)
- [Production Gate #5 evidence](docs/production-gate-5-documentflow.md)
- [ERP production architecture](docs/erp-production.md)
- [Production Gate #6 evidence](docs/production-gate-6-erp.md)
- [Gate #7 readiness audit](docs/production-gate-7-audit.md)
- [Production environment contract](docs/production-environment.md)
- [Deployment runbook](docs/production-deployment.md)
- [Operations runbook](docs/production-operations.md)
- [Release checklist](docs/production-release-checklist.md)
- [Rollback](docs/production-rollback.md)
- [Secret rotation](docs/secret-rotation.md)
- [Incident response](docs/incident-response.md)
- [Gate #7 deployment report](docs/production-gate-7-deployment.md)

The production build never packages SQLite. The preserved SQLite file is a migration/rollback artifact only.
