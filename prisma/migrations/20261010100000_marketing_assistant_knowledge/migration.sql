-- Tenant-owned HayDev Assistent policy and approved marketing knowledge.

CREATE TABLE "MarketingAssistantProfile" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL DEFAULT 'HayDev Assistent',
  "systemPrompt" TEXT NOT NULL DEFAULT '',
  "allowedTopics" TEXT NOT NULL DEFAULT '[]',
  "forbiddenTopics" TEXT NOT NULL DEFAULT '[]',
  "responseRules" TEXT NOT NULL DEFAULT '[]',
  "language" TEXT NOT NULL DEFAULT 'ru',
  "autoReplyMode" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "MarketingAssistantProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketingAssistantKnowledge" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'sales_script',
  "content" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "MarketingAssistantKnowledge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingAssistantProfile_orgId_key" ON "MarketingAssistantProfile"("orgId");
CREATE INDEX "MarketingAssistantKnowledge_orgId_enabled_updatedAt_idx" ON "MarketingAssistantKnowledge"("orgId", "enabled", "updatedAt");
CREATE UNIQUE INDEX "MarketingAssistantKnowledge_orgId_contentHash_key" ON "MarketingAssistantKnowledge"("orgId", "contentHash");

ALTER TABLE "MarketingAssistantProfile"
  ADD CONSTRAINT "MarketingAssistantProfile_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketingAssistantKnowledge"
  ADD CONSTRAINT "MarketingAssistantKnowledge_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketingAssistantKnowledge"
  ADD CONSTRAINT "MarketingAssistantKnowledge_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "MarketingAssistantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketingAssistantKnowledge"
  ADD CONSTRAINT "MarketingAssistantKnowledge_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MarketingAssistantProfile"
  ADD CONSTRAINT "MarketingAssistantProfile_autoReplyMode_check"
  CHECK ("autoReplyMode" IN ('draft', 'approval', 'auto'));

ALTER TABLE "MarketingAssistantKnowledge"
  ADD CONSTRAINT "MarketingAssistantKnowledge_kind_check"
  CHECK ("kind" IN ('sales_script', 'support_script', 'brand_voice', 'faq', 'policy', 'other'));

ALTER TABLE "MarketingAssistantProfile" ENABLE ROW LEVEL SECURITY;
CREATE POLICY haydev_runtime_server_access ON "MarketingAssistantProfile"
  FOR ALL TO haydev_runtime USING (true) WITH CHECK (true);

ALTER TABLE "MarketingAssistantKnowledge" ENABLE ROW LEVEL SECURITY;
CREATE POLICY haydev_runtime_server_access ON "MarketingAssistantKnowledge"
  FOR ALL TO haydev_runtime USING (true) WITH CHECK (true);

REVOKE ALL PRIVILEGES ON TABLE "MarketingAssistantProfile", "MarketingAssistantKnowledge" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE "MarketingAssistantProfile", "MarketingAssistantKnowledge" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE "MarketingAssistantProfile", "MarketingAssistantKnowledge" FROM authenticated;
  END IF;
END;
$$;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "MarketingAssistantProfile", "MarketingAssistantKnowledge" TO haydev_runtime;

CREATE TRIGGER "MarketingAssistantKnowledge_creator_membership"
  BEFORE INSERT OR UPDATE OF "createdById", "orgId"
  ON "MarketingAssistantKnowledge"
  FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('createdById');
