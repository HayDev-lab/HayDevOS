-- Async export handoff for Supabase Edge workers.
-- The authenticated Next route creates the job; the Edge worker claims it with
-- a one-time token and writes the result to the private Storage bucket.

CREATE TABLE "ExportJob" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'LEADS_CSV',
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "tokenHash" TEXT NOT NULL,
  "storageBucket" TEXT,
  "storageKey" TEXT,
  "rowCount" INTEGER,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExportJob_tokenHash_key" ON "ExportJob"("tokenHash");
CREATE INDEX "ExportJob_orgId_status_createdAt_idx" ON "ExportJob"("orgId", "status", "createdAt");
CREATE INDEX "ExportJob_requestedById_createdAt_idx" ON "ExportJob"("requestedById", "createdAt");
CREATE INDEX "ExportJob_expiresAt_status_idx" ON "ExportJob"("expiresAt", "status");

ALTER TABLE "ExportJob"
  ADD CONSTRAINT "ExportJob_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExportJob"
  ADD CONSTRAINT "ExportJob_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExportJob"
  ADD CONSTRAINT "ExportJob_kind_check" CHECK ("kind" IN ('LEADS_CSV'));

ALTER TABLE "ExportJob"
  ADD CONSTRAINT "ExportJob_status_check" CHECK ("status" IN ('QUEUED','RUNNING','SUCCEEDED','FAILED','EXPIRED'));

ALTER TABLE "ExportJob"
  ADD CONSTRAINT "ExportJob_row_count_check" CHECK ("rowCount" IS NULL OR "rowCount" >= 0);

ALTER TABLE "ExportJob" ENABLE ROW LEVEL SECURITY;
CREATE POLICY haydev_runtime_server_access ON "ExportJob"
  FOR ALL TO haydev_runtime USING (true) WITH CHECK (true);

REVOKE ALL PRIVILEGES ON TABLE "ExportJob" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE "ExportJob" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE "ExportJob" FROM authenticated;
  END IF;
END;
$$;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "ExportJob" TO haydev_runtime;

CREATE TRIGGER "ExportJob_requester_membership"
  BEFORE INSERT OR UPDATE OF "requestedById", "orgId"
  ON "ExportJob"
  FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('requestedById');

