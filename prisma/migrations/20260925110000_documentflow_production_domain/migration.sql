-- Gate #5: authoritative DocumentFlow metadata, immutable file versions,
-- quote artifact bindings, tenant invariants, and least-privilege access.
-- Storage bucket/object creation is intentionally performed through the
-- Supabase Storage API, never by mutating the managed storage schema here.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public."GeneratedQuoteDocument") THEN
    RAISE EXCEPTION 'Gate 5 requires existing GeneratedQuoteDocument rows to be exported/reconciled before adding authoritative binary bindings';
  END IF;
END;
$$;

DROP INDEX "GeneratedQuoteDocument_quoteVersionId_format_templateVersio_key";

ALTER TABLE "DocumentRecord"
  ADD COLUMN "archivedAt" TIMESTAMPTZ(3),
  ADD COLUMN "currentVersionId" TEXT,
  ADD COLUMN "currentVersionNumber" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "documentType" TEXT NOT NULL DEFAULT 'upload',
  ADD COLUMN "generationKey" TEXT,
  ADD COLUMN "sourceId" TEXT,
  ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'UPLOAD',
  ADD COLUMN "title" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMPTZ(3);

UPDATE "DocumentRecord" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "DocumentRecord" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "GeneratedQuoteDocument"
  ADD COLUMN "documentId" TEXT NOT NULL,
  ADD COLUMN "documentVersionId" TEXT NOT NULL,
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';

CREATE TABLE "DocumentVersion" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "storageBucket" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "scanStatus" TEXT NOT NULL DEFAULT 'PENDING_SCAN',
  "templateVersion" TEXT,
  "locale" TEXT,
  "sourceSnapshot" JSONB,
  "createdById" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentTemplate" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "locale" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "definition" JSONB NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentGeneration" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "quoteVersionId" TEXT NOT NULL,
  "generationKey" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "templateVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "initiatedBy" TEXT NOT NULL DEFAULT 'USER',
  "actorId" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3),
  CONSTRAINT "DocumentGeneration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentAccessEvent" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "documentVersionId" TEXT,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "initiatedBy" TEXT NOT NULL DEFAULT 'USER',
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentAccessEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentVersion_orgId_createdAt_idx" ON "DocumentVersion"("orgId", "createdAt");
CREATE INDEX "DocumentVersion_orgId_sha256_idx" ON "DocumentVersion"("orgId", "sha256");
CREATE INDEX "DocumentVersion_documentId_createdAt_idx" ON "DocumentVersion"("documentId", "createdAt");
CREATE UNIQUE INDEX "DocumentVersion_documentId_versionNumber_key" ON "DocumentVersion"("documentId", "versionNumber");
CREATE UNIQUE INDEX "DocumentVersion_id_documentId_orgId_key" ON "DocumentVersion"("id", "documentId", "orgId");
CREATE UNIQUE INDEX "DocumentVersion_storageBucket_storageKey_key" ON "DocumentVersion"("storageBucket", "storageKey");
CREATE INDEX "DocumentTemplate_orgId_type_status_idx" ON "DocumentTemplate"("orgId", "type", "status");
CREATE UNIQUE INDEX "DocumentTemplate_orgId_key_version_key" ON "DocumentTemplate"("orgId", "key", "version");
CREATE UNIQUE INDEX "DocumentGeneration_documentVersionId_key" ON "DocumentGeneration"("documentVersionId");
CREATE INDEX "DocumentGeneration_orgId_generationKey_status_idx" ON "DocumentGeneration"("orgId", "generationKey", "status");
CREATE UNIQUE INDEX "DocumentGeneration_active_key_key" ON "DocumentGeneration"("orgId", "generationKey") WHERE "status" IN ('RUNNING', 'SUCCEEDED');
CREATE INDEX "DocumentGeneration_quoteId_createdAt_idx" ON "DocumentGeneration"("quoteId", "createdAt");
CREATE INDEX "DocumentGeneration_documentId_createdAt_idx" ON "DocumentGeneration"("documentId", "createdAt");
CREATE UNIQUE INDEX "DocumentGeneration_documentVersionId_documentId_orgId_key" ON "DocumentGeneration"("documentVersionId", "documentId", "orgId");
CREATE INDEX "DocumentAccessEvent_orgId_createdAt_idx" ON "DocumentAccessEvent"("orgId", "createdAt");
CREATE INDEX "DocumentAccessEvent_documentId_createdAt_idx" ON "DocumentAccessEvent"("documentId", "createdAt");
CREATE INDEX "DocumentAccessEvent_actorId_createdAt_idx" ON "DocumentAccessEvent"("actorId", "createdAt");
CREATE UNIQUE INDEX "DocumentRecord_currentVersionId_key" ON "DocumentRecord"("currentVersionId");
CREATE INDEX "DocumentRecord_orgId_documentType_createdAt_idx" ON "DocumentRecord"("orgId", "documentType", "createdAt");
CREATE INDEX "DocumentRecord_orgId_sourceType_sourceId_idx" ON "DocumentRecord"("orgId", "sourceType", "sourceId");
CREATE INDEX "DocumentRecord_orgId_archivedAt_createdAt_idx" ON "DocumentRecord"("orgId", "archivedAt", "createdAt");
CREATE UNIQUE INDEX "DocumentRecord_id_orgId_key" ON "DocumentRecord"("id", "orgId");
CREATE UNIQUE INDEX "DocumentRecord_orgId_generationKey_key" ON "DocumentRecord"("orgId", "generationKey");
CREATE UNIQUE INDEX "GeneratedQuoteDocument_documentVersionId_key" ON "GeneratedQuoteDocument"("documentVersionId");
CREATE UNIQUE INDEX "GeneratedQuoteDocument_quoteVersionId_format_templateVersio_key" ON "GeneratedQuoteDocument"("quoteVersionId", "format", "templateVersion", "locale");
CREATE UNIQUE INDEX "GeneratedQuoteDocument_documentVersionId_documentId_orgId_key" ON "GeneratedQuoteDocument"("documentVersionId", "documentId", "orgId");

ALTER TABLE "GeneratedQuoteDocument" ADD CONSTRAINT "GeneratedQuoteDocument_documentId_orgId_fkey" FOREIGN KEY ("documentId", "orgId") REFERENCES "DocumentRecord"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_orgId_fkey" FOREIGN KEY ("documentId", "orgId") REFERENCES "DocumentRecord"("id", "orgId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GeneratedQuoteDocument" ADD CONSTRAINT "GeneratedQuoteDocument_documentVersionId_documentId_orgId_fkey" FOREIGN KEY ("documentVersionId", "documentId", "orgId") REFERENCES "DocumentVersion"("id", "documentId", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentGeneration" ADD CONSTRAINT "DocumentGeneration_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentGeneration" ADD CONSTRAINT "DocumentGeneration_documentId_orgId_fkey" FOREIGN KEY ("documentId", "orgId") REFERENCES "DocumentRecord"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentGeneration" ADD CONSTRAINT "DocumentGeneration_documentVersionId_documentId_orgId_fkey" FOREIGN KEY ("documentVersionId", "documentId", "orgId") REFERENCES "DocumentVersion"("id", "documentId", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentGeneration" ADD CONSTRAINT "DocumentGeneration_quoteVersionId_quoteId_orgId_fkey" FOREIGN KEY ("quoteVersionId", "quoteId", "orgId") REFERENCES "QuoteVersion"("id", "quoteId", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentGeneration" ADD CONSTRAINT "DocumentGeneration_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentAccessEvent" ADD CONSTRAINT "DocumentAccessEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentAccessEvent" ADD CONSTRAINT "DocumentAccessEvent_documentId_orgId_fkey" FOREIGN KEY ("documentId", "orgId") REFERENCES "DocumentRecord"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentAccessEvent" ADD CONSTRAINT "DocumentAccessEvent_documentVersionId_documentId_orgId_fkey" FOREIGN KEY ("documentVersionId", "documentId", "orgId") REFERENCES "DocumentVersion"("id", "documentId", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentAccessEvent" ADD CONSTRAINT "DocumentAccessEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_version_number_check" CHECK ("currentVersionNumber" >= 0);
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_source_type_check" CHECK ("sourceType" IN ('UPLOAD','QUOTE','LEAD','CUSTOMER','TASK','SYSTEM'));
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_type_check" CHECK ("documentType" IN ('upload','quote_pdf','quote_docx','quote_json'));
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_number_check" CHECK ("versionNumber" > 0);
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_status_check" CHECK ("status" IN ('UPLOADING','GENERATING','PENDING_SCAN','ACTIVE','FAILED','REJECTED'));
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_scan_status_check" CHECK ("scanStatus" IN ('NOT_REQUIRED','PENDING_SCAN','CLEAN','INFECTED','SCAN_FAILED'));
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_size_check" CHECK ("sizeBytes" >= 0 AND "sizeBytes" <= 26214400);
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_sha256_check" CHECK ("sha256" ~ '^[0-9a-f]{64}$');
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_filename_check" CHECK (length("filename") BETWEEN 1 AND 240 AND "filename" !~ '[[:cntrl:]/\\]');
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_storage_key_check" CHECK ("storageKey" LIKE ('organizations/' || "orgId" || '/documents/' || "documentId" || '/versions/' || "id" || '/%') AND "storageKey" NOT LIKE '%..%' AND "storageKey" !~ E'\\\\');
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_status_check" CHECK ("status" IN ('ACTIVE','ARCHIVED'));
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_type_check" CHECK ("type" IN ('QUOTE'));
ALTER TABLE "DocumentGeneration" ADD CONSTRAINT "DocumentGeneration_status_check" CHECK ("status" IN ('RUNNING','SUCCEEDED','FAILED'));
ALTER TABLE "DocumentGeneration" ADD CONSTRAINT "DocumentGeneration_format_check" CHECK ("format" IN ('pdf','docx','json'));
ALTER TABLE "DocumentGeneration" ADD CONSTRAINT "DocumentGeneration_locale_check" CHECK ("locale" IN ('hy','ru','en'));
ALTER TABLE "DocumentGeneration" ADD CONSTRAINT "DocumentGeneration_initiator_check" CHECK ("initiatedBy" IN ('USER','OWNER_AI','AUTOMATION','SYSTEM'));
ALTER TABLE "DocumentAccessEvent" ADD CONSTRAINT "DocumentAccessEvent_outcome_check" CHECK ("outcome" IN ('ALLOWED','DENIED','FAILED'));
ALTER TABLE "GeneratedQuoteDocument" ADD CONSTRAINT "GeneratedQuoteDocument_locale_check" CHECK ("locale" IN ('hy','ru','en'));

CREATE FUNCTION public.haydev_assert_document_source_tenant()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE source_found BOOLEAN;
BEGIN
  IF NEW."sourceType" IN ('UPLOAD','SYSTEM') THEN
    IF NEW."sourceId" IS NOT NULL THEN RAISE EXCEPTION 'Upload/system documents cannot carry an entity source id'; END IF;
    RETURN NEW;
  END IF;
  IF NEW."sourceId" IS NULL THEN RAISE EXCEPTION 'Entity-backed document requires a source id'; END IF;
  CASE NEW."sourceType"
    WHEN 'QUOTE' THEN SELECT EXISTS(SELECT 1 FROM public."Quote" WHERE "id" = NEW."sourceId" AND "orgId" = NEW."orgId") INTO source_found;
    WHEN 'LEAD' THEN SELECT EXISTS(SELECT 1 FROM public."Lead" WHERE "id" = NEW."sourceId" AND "orgId" = NEW."orgId") INTO source_found;
    WHEN 'CUSTOMER' THEN SELECT EXISTS(SELECT 1 FROM public."Customer" WHERE "id" = NEW."sourceId" AND "orgId" = NEW."orgId") INTO source_found;
    WHEN 'TASK' THEN SELECT EXISTS(SELECT 1 FROM public."Task" WHERE "id" = NEW."sourceId" AND "orgId" = NEW."orgId") INTO source_found;
    ELSE source_found := false;
  END CASE;
  IF NOT source_found THEN RAISE EXCEPTION 'Document source must belong to the same tenant'; END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.haydev_assert_document_current_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE linked RECORD;
BEGIN
  IF NEW."currentVersionId" IS NULL THEN RETURN NEW; END IF;
  SELECT "documentId", "orgId", "versionNumber", "status" INTO linked FROM public."DocumentVersion" WHERE "id" = NEW."currentVersionId";
  IF NOT FOUND OR linked."documentId" <> NEW."id" OR linked."orgId" <> NEW."orgId" OR linked."versionNumber" <> NEW."currentVersionNumber" OR linked."status" NOT IN ('ACTIVE','PENDING_SCAN') THEN
    RAISE EXCEPTION 'Current document version must be active/pending-scan and belong to the same document and tenant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.haydev_protect_document_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF current_user <> 'haydev_runtime' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Document versions are immutable'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','scanStatus','errorCode','errorMessage']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','scanStatus','errorCode','errorMessage']) THEN
    RAISE EXCEPTION 'Document version identity and file metadata are immutable';
  END IF;
  IF OLD."status" IN ('ACTIVE','REJECTED') THEN RAISE EXCEPTION 'Final document versions are immutable'; END IF;
  IF OLD."status" = 'FAILED' THEN RAISE EXCEPTION 'Failed document versions are immutable; create a new version to retry'; END IF;
  IF OLD."status" IN ('UPLOADING','GENERATING') AND NEW."status" NOT IN ('ACTIVE','PENDING_SCAN','FAILED') THEN RAISE EXCEPTION 'Invalid document finalization transition'; END IF;
  IF OLD."status" = 'PENDING_SCAN' AND NEW."status" NOT IN ('ACTIVE','REJECTED','FAILED','PENDING_SCAN') THEN RAISE EXCEPTION 'Invalid document scan transition'; END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.haydev_protect_document_generation()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF current_user <> 'haydev_runtime' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Document generation history is append-only'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','errorCode','errorMessage','completedAt']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','errorCode','errorMessage','completedAt']) THEN
    RAISE EXCEPTION 'Document generation identity is immutable';
  END IF;
  IF OLD."status" <> 'RUNNING' OR NEW."status" NOT IN ('RUNNING','SUCCEEDED','FAILED') THEN RAISE EXCEPTION 'Final document generation is immutable'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "DocumentRecord_source_tenant" BEFORE INSERT OR UPDATE OF "sourceType", "sourceId", "orgId" ON "DocumentRecord" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_document_source_tenant();
CREATE TRIGGER "DocumentRecord_current_version_same_document" BEFORE INSERT OR UPDATE OF "currentVersionId", "currentVersionNumber", "orgId" ON "DocumentRecord" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_document_current_version();
CREATE TRIGGER "DocumentVersion_creator_membership" BEFORE INSERT OR UPDATE OF "createdById", "orgId" ON "DocumentVersion" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('createdById');
CREATE TRIGGER "DocumentTemplate_creator_membership" BEFORE INSERT OR UPDATE OF "createdById", "orgId" ON "DocumentTemplate" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('createdById');
CREATE TRIGGER "DocumentGeneration_actor_membership" BEFORE INSERT OR UPDATE OF "actorId", "orgId" ON "DocumentGeneration" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('actorId');
CREATE TRIGGER "DocumentAccessEvent_actor_membership" BEFORE INSERT OR UPDATE OF "actorId", "orgId" ON "DocumentAccessEvent" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('actorId');
CREATE TRIGGER "DocumentVersion_runtime_protected" BEFORE UPDATE OR DELETE ON "DocumentVersion" FOR EACH ROW EXECUTE FUNCTION public.haydev_protect_document_version();
CREATE TRIGGER "DocumentGeneration_runtime_protected" BEFORE UPDATE OR DELETE ON "DocumentGeneration" FOR EACH ROW EXECUTE FUNCTION public.haydev_protect_document_generation();
CREATE TRIGGER "DocumentTemplate_runtime_immutable" BEFORE UPDATE OR DELETE ON "DocumentTemplate" FOR EACH ROW EXECUTE FUNCTION public.haydev_prevent_runtime_history_mutation();
CREATE TRIGGER "DocumentAccessEvent_runtime_immutable" BEFORE UPDATE OR DELETE ON "DocumentAccessEvent" FOR EACH ROW EXECUTE FUNCTION public.haydev_prevent_runtime_history_mutation();

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['DocumentVersion','DocumentTemplate','DocumentGeneration','DocumentAccessEvent'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY haydev_runtime_server_access ON public.%I FOR ALL TO haydev_runtime USING (true) WITH CHECK (true)', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', table_name); END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM authenticated', table_name); END IF;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO haydev_runtime', table_name);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.haydev_assert_document_source_tenant() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.haydev_assert_document_current_version() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.haydev_protect_document_version() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.haydev_protect_document_generation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.haydev_assert_document_source_tenant() TO haydev_runtime;
GRANT EXECUTE ON FUNCTION public.haydev_assert_document_current_version() TO haydev_runtime;
GRANT EXECUTE ON FUNCTION public.haydev_protect_document_version() TO haydev_runtime;
GRANT EXECUTE ON FUNCTION public.haydev_protect_document_generation() TO haydev_runtime;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE public."DocumentRecord", public."DocumentField", public."GeneratedQuoteDocument" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE public."DocumentRecord", public."DocumentField", public."GeneratedQuoteDocument" FROM authenticated;
  END IF;
END;
$$;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."DocumentRecord", public."DocumentField", public."GeneratedQuoteDocument" TO haydev_runtime;
