-- Tenant-owned public competitor monitoring. Store bounded text snapshots only;
-- no raw HTML, cookies, browser sessions or provider secrets are persisted.

CREATE TABLE "CompetitorMonitor" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "createdById" TEXT,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL DEFAULT 'auto',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "cadenceDays" INTEGER NOT NULL DEFAULT 3,
  "lastCheckedAt" TIMESTAMPTZ(3),
  "nextCheckAt" TIMESTAMPTZ(3),
  "lastStatus" TEXT NOT NULL DEFAULT 'pending',
  "lastError" TEXT,
  "leaseUntil" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "CompetitorMonitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompetitorSnapshot" (
  "id" TEXT NOT NULL,
  "monitorId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "contentType" TEXT,
  "title" TEXT,
  "description" TEXT,
  "contentHash" TEXT NOT NULL,
  "contentText" TEXT NOT NULL,
  "contentBytes" INTEGER NOT NULL,
  "fetchedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompetitorSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompetitorAnalysis" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "periodStart" TIMESTAMPTZ(3) NOT NULL,
  "periodEnd" TIMESTAMPTZ(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "provider" TEXT NOT NULL DEFAULT 'local-heuristic',
  "summary" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "CompetitorAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompetitorMonitor_orgId_url_key" ON "CompetitorMonitor"("orgId", "url");
CREATE INDEX "CompetitorMonitor_orgId_enabled_nextCheckAt_idx" ON "CompetitorMonitor"("orgId", "enabled", "nextCheckAt");
CREATE INDEX "CompetitorMonitor_orgId_lastStatus_idx" ON "CompetitorMonitor"("orgId", "lastStatus");
CREATE UNIQUE INDEX "CompetitorSnapshot_monitorId_contentHash_key" ON "CompetitorSnapshot"("monitorId", "contentHash");
CREATE INDEX "CompetitorSnapshot_orgId_monitorId_fetchedAt_idx" ON "CompetitorSnapshot"("orgId", "monitorId", "fetchedAt");
CREATE UNIQUE INDEX "CompetitorAnalysis_orgId_periodKey_key" ON "CompetitorAnalysis"("orgId", "periodKey");
CREATE INDEX "CompetitorAnalysis_orgId_periodEnd_idx" ON "CompetitorAnalysis"("orgId", "periodEnd");

ALTER TABLE "CompetitorMonitor"
  ADD CONSTRAINT "CompetitorMonitor_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompetitorMonitor"
  ADD CONSTRAINT "CompetitorMonitor_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompetitorSnapshot"
  ADD CONSTRAINT "CompetitorSnapshot_monitorId_fkey"
  FOREIGN KEY ("monitorId") REFERENCES "CompetitorMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompetitorSnapshot"
  ADD CONSTRAINT "CompetitorSnapshot_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompetitorAnalysis"
  ADD CONSTRAINT "CompetitorAnalysis_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompetitorMonitor"
  ADD CONSTRAINT "CompetitorMonitor_sourceType_check"
  CHECK ("sourceType" IN ('auto', 'webpage', 'rss', 'sitemap', 'json'));

ALTER TABLE "CompetitorMonitor"
  ADD CONSTRAINT "CompetitorMonitor_cadenceDays_check"
  CHECK ("cadenceDays" BETWEEN 1 AND 30);

ALTER TABLE "CompetitorMonitor"
  ADD CONSTRAINT "CompetitorMonitor_lastStatus_check"
  CHECK ("lastStatus" IN ('pending', 'unchanged', 'changed', 'blocked', 'error'));

ALTER TABLE "CompetitorAnalysis"
  ADD CONSTRAINT "CompetitorAnalysis_status_check"
  CHECK ("status" IN ('queued', 'running', 'completed', 'failed'));

ALTER TABLE "CompetitorMonitor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY haydev_runtime_server_access ON "CompetitorMonitor"
  FOR ALL TO haydev_runtime USING (true) WITH CHECK (true);

ALTER TABLE "CompetitorSnapshot" ENABLE ROW LEVEL SECURITY;
CREATE POLICY haydev_runtime_server_access ON "CompetitorSnapshot"
  FOR ALL TO haydev_runtime USING (true) WITH CHECK (true);

ALTER TABLE "CompetitorAnalysis" ENABLE ROW LEVEL SECURITY;
CREATE POLICY haydev_runtime_server_access ON "CompetitorAnalysis"
  FOR ALL TO haydev_runtime USING (true) WITH CHECK (true);

REVOKE ALL PRIVILEGES ON TABLE "CompetitorMonitor", "CompetitorSnapshot", "CompetitorAnalysis" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE "CompetitorMonitor", "CompetitorSnapshot", "CompetitorAnalysis" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE "CompetitorMonitor", "CompetitorSnapshot", "CompetitorAnalysis" FROM authenticated;
  END IF;
END;
$$;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "CompetitorMonitor", "CompetitorSnapshot", "CompetitorAnalysis" TO haydev_runtime;

CREATE TRIGGER "CompetitorMonitor_creator_membership"
  BEFORE INSERT OR UPDATE OF "createdById", "orgId"
  ON "CompetitorMonitor"
  FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('createdById');
