BEGIN;

-- Tenant-owned pipelines and stages replace the UI-only stage catalogue.
CREATE TABLE "LeadPipeline" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "LeadPipeline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadPipelineStage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "isWon" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "LeadPipelineStage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LeadPipelineStage_position_check" CHECK ("position" >= 0)
);

CREATE TABLE "LeadNote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LeadNote_body_check" CHECK (char_length(btrim("body")) BETWEEN 1 AND 5000)
);

CREATE TABLE "LeadSlaPolicy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "firstResponseMinutes" INTEGER NOT NULL DEFAULT 240,
    "warningMinutes" INTEGER NOT NULL DEFAULT 60,
    "followUpMinutes" INTEGER NOT NULL DEFAULT 2880,
    "stageInactivityMinutes" INTEGER NOT NULL DEFAULT 10080,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "LeadSlaPolicy_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LeadSlaPolicy_thresholds_check" CHECK (
        "firstResponseMinutes" BETWEEN 1 AND 525600
        AND "warningMinutes" BETWEEN 0 AND 525600
        AND "warningMinutes" <= "firstResponseMinutes"
        AND "followUpMinutes" BETWEEN 1 AND 525600
        AND "stageInactivityMinutes" BETWEEN 1 AND 525600
    )
);

ALTER TABLE "Lead"
    ADD COLUMN "normalizedEmail" TEXT,
    ADD COLUMN "normalizedPhone" TEXT,
    ADD COLUMN "externalId" TEXT,
    ADD COLUMN "pipelineId" TEXT,
    ADD COLUMN "stageId" TEXT,
    ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD',
    ADD COLUMN "archivedAt" TIMESTAMPTZ(3);

ALTER TABLE "LeadActivity"
    ADD COLUMN "actorId" TEXT,
    ADD COLUMN "metadata" TEXT;

ALTER TABLE "Task"
    ADD COLUMN "createdById" TEXT,
    ADD COLUMN "type" TEXT NOT NULL DEFAULT 'FOLLOW_UP',
    ADD COLUMN "completedAt" TIMESTAMPTZ(3),
    ADD COLUMN "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Task" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "AutomationRun"
    ADD COLUMN "eventType" TEXT,
    ADD COLUMN "idempotencyKey" TEXT,
    ADD COLUMN "payload" TEXT;

ALTER TABLE "WebhookEvent"
    ADD COLUMN "processedAt" TIMESTAMPTZ(3),
    ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "error" TEXT,
    ADD COLUMN "resultEntityType" TEXT,
    ADD COLUMN "resultEntityId" TEXT,
    ADD COLUMN "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WebhookEvent" ALTER COLUMN "updatedAt" DROP DEFAULT;

UPDATE "Lead" SET "source" = 'web' WHERE "source" IS NULL;
ALTER TABLE "Lead" ALTER COLUMN "source" SET DEFAULT 'web';
ALTER TABLE "Lead" ALTER COLUMN "source" SET NOT NULL;

-- Backfill normalized identities without making pre-existing duplicate rows
-- un-migratable. The first row gets the canonical key; later duplicates remain
-- visible but must be resolved through the application before they can become
-- canonical.
WITH ranked AS (
    SELECT "id",
           lower(btrim("email")) AS normalized,
           row_number() OVER (
               PARTITION BY "orgId", lower(btrim("email"))
               ORDER BY "createdAt", "id"
           ) AS duplicate_rank
    FROM "Lead"
    WHERE "email" IS NOT NULL AND btrim("email") <> ''
)
UPDATE "Lead" AS lead
SET "normalizedEmail" = CASE WHEN ranked.duplicate_rank = 1 THEN ranked.normalized ELSE NULL END
FROM ranked
WHERE lead."id" = ranked."id";

WITH ranked AS (
    SELECT "id",
           CASE
               WHEN regexp_replace("phone", '[^0-9]+', '', 'g') = '' THEN NULL
               ELSE '+' || regexp_replace("phone", '[^0-9]+', '', 'g')
           END AS normalized,
           row_number() OVER (
               PARTITION BY "orgId", regexp_replace("phone", '[^0-9]+', '', 'g')
               ORDER BY "createdAt", "id"
           ) AS duplicate_rank
    FROM "Lead"
    WHERE "phone" IS NOT NULL
      AND regexp_replace("phone", '[^0-9]+', '', 'g') <> ''
)
UPDATE "Lead" AS lead
SET "normalizedPhone" = CASE WHEN ranked.duplicate_rank = 1 THEN ranked.normalized ELSE NULL END
FROM ranked
WHERE lead."id" = ranked."id";

-- Every existing organization receives the canonical default pipeline. This
-- also makes the migration safe for a non-empty database.
INSERT INTO "LeadPipeline" ("id", "orgId", "name", "isDefault", "createdAt", "updatedAt")
SELECT 'lp_' || substr(md5(org."id" || ':default'), 1, 24),
       org."id",
       'Sales Pipeline',
       true,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "Organization" AS org;

INSERT INTO "LeadPipelineStage" (
    "id", "orgId", "pipelineId", "key", "name", "position", "isClosed", "isWon", "color", "createdAt", "updatedAt"
)
SELECT 'lps_' || substr(md5(p."id" || ':' || stage.key), 1, 24),
       p."orgId",
       p."id",
       stage.key,
       stage.name,
       stage.position,
       stage.is_closed,
       stage.is_won,
       stage.color,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "LeadPipeline" AS p
CROSS JOIN (VALUES
    ('new',         'New',         0, false, false, 'cyan'),
    ('contacted',   'Contacted',   1, false, false, 'muted'),
    ('qualified',   'Qualified',   2, false, false, 'lime'),
    ('proposal',    'Proposal',    3, false, false, 'amber'),
    ('negotiation', 'Negotiation', 4, false, false, 'violet'),
    ('won',         'Won',         5, true,  true,  'success'),
    ('lost',        'Lost',        6, true,  false, 'rose')
) AS stage(key, name, position, is_closed, is_won, color)
WHERE p."isDefault" = true;

UPDATE "Lead" AS lead
SET "pipelineId" = pipeline."id",
    "stageId" = stage."id",
    "stage" = stage."key"
FROM "LeadPipeline" AS pipeline
JOIN "LeadPipelineStage" AS stage
  ON stage."pipelineId" = pipeline."id"
 AND stage."orgId" = pipeline."orgId"
WHERE pipeline."orgId" = lead."orgId"
  AND pipeline."isDefault" = true
  AND stage."key" = CASE
      WHEN lead."stage" IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')
      THEN lead."stage"
      ELSE 'new'
  END;

ALTER TABLE "Lead" ALTER COLUMN "pipelineId" SET NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "stageId" SET NOT NULL;

CREATE UNIQUE INDEX "LeadPipeline_orgId_name_key" ON "LeadPipeline"("orgId", "name");
CREATE UNIQUE INDEX "LeadPipeline_id_orgId_key" ON "LeadPipeline"("id", "orgId");
CREATE INDEX "LeadPipeline_orgId_isDefault_idx" ON "LeadPipeline"("orgId", "isDefault");
CREATE UNIQUE INDEX "LeadPipelineStage_pipelineId_key_key" ON "LeadPipelineStage"("pipelineId", "key");
CREATE UNIQUE INDEX "LeadPipelineStage_id_pipelineId_orgId_key" ON "LeadPipelineStage"("id", "pipelineId", "orgId");
CREATE INDEX "LeadPipelineStage_orgId_pipelineId_position_idx" ON "LeadPipelineStage"("orgId", "pipelineId", "position");

CREATE UNIQUE INDEX "Lead_id_orgId_key" ON "Lead"("id", "orgId");
CREATE UNIQUE INDEX "Lead_orgId_normalizedEmail_key" ON "Lead"("orgId", "normalizedEmail");
CREATE UNIQUE INDEX "Lead_orgId_normalizedPhone_key" ON "Lead"("orgId", "normalizedPhone");
CREATE UNIQUE INDEX "Lead_orgId_source_externalId_key" ON "Lead"("orgId", "source", "externalId");
CREATE INDEX "Lead_orgId_createdAt_idx" ON "Lead"("orgId", "createdAt");
CREATE INDEX "Lead_orgId_updatedAt_idx" ON "Lead"("orgId", "updatedAt");
CREATE INDEX "Lead_orgId_pipelineId_stageId_idx" ON "Lead"("orgId", "pipelineId", "stageId");
CREATE INDEX "Lead_orgId_source_idx" ON "Lead"("orgId", "source");
CREATE INDEX "Lead_orgId_slaDueAt_idx" ON "Lead"("orgId", "slaDueAt");
CREATE INDEX "Lead_orgId_lastActivityAt_idx" ON "Lead"("orgId", "lastActivityAt");

CREATE INDEX "LeadActivity_actorId_idx" ON "LeadActivity"("actorId");
CREATE INDEX "LeadNote_orgId_leadId_createdAt_idx" ON "LeadNote"("orgId", "leadId", "createdAt");
CREATE INDEX "LeadNote_authorId_idx" ON "LeadNote"("authorId");
CREATE UNIQUE INDEX "LeadSlaPolicy_orgId_key" ON "LeadSlaPolicy"("orgId");
CREATE INDEX "Task_orgId_type_status_dueAt_idx" ON "Task"("orgId", "type", "status", "dueAt");
CREATE INDEX "Task_orgId_assigneeId_status_dueAt_idx" ON "Task"("orgId", "assigneeId", "status", "dueAt");
CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");
CREATE UNIQUE INDEX "AutomationRun_orgId_automationId_idempotencyKey_key"
    ON "AutomationRun"("orgId", "automationId", "idempotencyKey");

ALTER TABLE "LeadPipeline"
    ADD CONSTRAINT "LeadPipeline_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadPipelineStage"
    ADD CONSTRAINT "LeadPipelineStage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadPipelineStage"
    ADD CONSTRAINT "LeadPipelineStage_pipelineId_orgId_fkey" FOREIGN KEY ("pipelineId", "orgId") REFERENCES "LeadPipeline"("id", "orgId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead"
    ADD CONSTRAINT "Lead_stageId_pipelineId_orgId_fkey" FOREIGN KEY ("stageId", "pipelineId", "orgId") REFERENCES "LeadPipelineStage"("id", "pipelineId", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadActivity"
    ADD CONSTRAINT "LeadActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadActivity" DROP CONSTRAINT "LeadActivity_leadId_fkey";
ALTER TABLE "LeadActivity"
    ADD CONSTRAINT "LeadActivity_leadId_orgId_fkey" FOREIGN KEY ("leadId", "orgId") REFERENCES "Lead"("id", "orgId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadNote"
    ADD CONSTRAINT "LeadNote_leadId_orgId_fkey" FOREIGN KEY ("leadId", "orgId") REFERENCES "Lead"("id", "orgId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadNote"
    ADD CONSTRAINT "LeadNote_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadNote"
    ADD CONSTRAINT "LeadNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadSlaPolicy"
    ADD CONSTRAINT "LeadSlaPolicy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task"
    ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" DROP CONSTRAINT "Task_leadId_fkey";
ALTER TABLE "Task"
    ADD CONSTRAINT "Task_leadId_orgId_fkey" FOREIGN KEY ("leadId", "orgId") REFERENCES "Lead"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_value_check" CHECK ("value" >= 0);
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "Task" ADD CONSTRAINT "Task_type_check" CHECK ("type" IN ('FOLLOW_UP', 'CALL', 'EMAIL', 'MEETING', 'OTHER'));
ALTER TABLE "Task" ADD CONSTRAINT "Task_status_check" CHECK ("status" IN ('todo', 'in_progress', 'done', 'blocked', 'cancelled'));
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_attempts_check" CHECK ("attempts" >= 0);

-- The canonical stage key is derived by the database from the tenant-owned
-- stage relation; callers cannot create a mismatched compatibility projection.
CREATE FUNCTION public.haydev_sync_lead_stage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    canonical_key TEXT;
BEGIN
    SELECT stage."key"
      INTO canonical_key
      FROM public."LeadPipelineStage" AS stage
     WHERE stage."id" = NEW."stageId"
       AND stage."pipelineId" = NEW."pipelineId"
       AND stage."orgId" = NEW."orgId";

    IF canonical_key IS NULL THEN
        RAISE EXCEPTION 'Referenced tenant stage does not exist'
            USING ERRCODE = '23503';
    END IF;

    NEW."stage" := canonical_key;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "Lead_sync_stage"
BEFORE INSERT OR UPDATE OF "stageId", "pipelineId", "orgId", "stage" ON "Lead"
FOR EACH ROW EXECUTE FUNCTION public.haydev_sync_lead_stage();

CREATE TRIGGER "LeadActivity_actor_membership"
BEFORE INSERT OR UPDATE OF "actorId", "orgId" ON "LeadActivity"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('actorId');

CREATE TRIGGER "LeadNote_author_membership"
BEFORE INSERT OR UPDATE OF "authorId", "orgId" ON "LeadNote"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('authorId');

CREATE TRIGGER "Task_creator_membership"
BEFORE INSERT OR UPDATE OF "createdById", "orgId" ON "Task"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('createdById');

-- Historical LeadOS events are append-only for the restricted runtime role.
CREATE FUNCTION public.haydev_prevent_runtime_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF current_user = 'haydev_runtime' THEN
        RAISE EXCEPTION 'Historical records are append-only'
            USING ERRCODE = '42501';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER "LeadActivity_append_only"
BEFORE UPDATE OR DELETE ON "LeadActivity"
FOR EACH ROW EXECUTE FUNCTION public.haydev_prevent_runtime_history_mutation();

-- Preserve the existing private server-only database architecture.
DO $$
DECLARE
    table_name TEXT;
    exposed_role TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'LeadPipeline',
        'LeadPipelineStage',
        'LeadNote',
        'LeadSlaPolicy'
    ] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format(
            'CREATE POLICY haydev_runtime_server_access ON public.%I FOR ALL TO haydev_runtime USING (true) WITH CHECK (true)',
            table_name
        );
        EXECUTE format(
            'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO haydev_runtime',
            table_name
        );
        FOREACH exposed_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = exposed_role) THEN
                EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, exposed_role);
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.haydev_sync_lead_stage() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.haydev_prevent_runtime_history_mutation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.haydev_sync_lead_stage() TO haydev_runtime;
GRANT EXECUTE ON FUNCTION public.haydev_prevent_runtime_history_mutation() TO haydev_runtime;

-- Runtime connects as this role. Authentication material is still set only by
-- the out-of-band deployment script/secret store.
ALTER ROLE haydev_runtime LOGIN;

COMMIT;
