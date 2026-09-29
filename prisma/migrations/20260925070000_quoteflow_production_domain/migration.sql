-- Gate #4: authoritative QuoteFlow domain, immutable versions, approvals,
-- race-safe numbering, reproducible document metadata, and tenant invariants.

ALTER TABLE "Quote" DROP CONSTRAINT "Quote_leadId_fkey";
ALTER TABLE "QuoteItem" DROP CONSTRAINT "QuoteItem_quoteId_fkey";
DROP INDEX "Quote_leadId_idx";
DROP INDEX "Quote_orgId_status_idx";
DROP INDEX "QuoteItem_quoteId_idx";

ALTER TABLE "Customer"
    ADD COLUMN "address" TEXT,
    ADD COLUMN "taxId" TEXT,
    ADD COLUMN "updatedAt" TIMESTAMPTZ(3);
UPDATE "Customer" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Customer" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "Product"
    ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "updatedAt" TIMESTAMPTZ(3);
UPDATE "Product" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;
ALTER TABLE "Product" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "Quote"
    ADD COLUMN "acceptedAt" TIMESTAMPTZ(3),
    ADD COLUMN "acceptedSource" TEXT,
    ADD COLUMN "acceptedVersionId" TEXT,
    ADD COLUMN "archivedAt" TIMESTAMPTZ(3),
    ADD COLUMN "createdById" TEXT,
    ADD COLUMN "currentVersionId" TEXT,
    ADD COLUMN "currentVersionNumber" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "customerAddress" TEXT,
    ADD COLUMN "customerEmail" TEXT,
    ADD COLUMN "customerName" TEXT,
    ADD COLUMN "customerTaxId" TEXT,
    ADD COLUMN "lineDiscount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    ADD COLUMN "notes" TEXT,
    ADD COLUMN "ownerId" TEXT,
    ADD COLUMN "quoteDiscount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    ADD COLUMN "quoteDiscountType" TEXT NOT NULL DEFAULT 'percent',
    ADD COLUMN "quoteDiscountValue" DECIMAL(19,4) NOT NULL DEFAULT 0,
    ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "sentAt" TIMESTAMPTZ(3),
    ADD COLUMN "sentVersionId" TEXT,
    ADD COLUMN "taxIncluded" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "taxRate" DECIMAL(9,4) NOT NULL DEFAULT 0,
    ADD COLUMN "terms" TEXT,
    ADD COLUMN "updatedAt" TIMESTAMPTZ(3);

UPDATE "Quote" AS quote
SET "customerName" = COALESCE(
        (SELECT customer."name" FROM "Customer" AS customer WHERE customer."id" = quote."customerId" AND customer."orgId" = quote."orgId"),
        (SELECT COALESCE(lead."company", lead."name") FROM "Lead" AS lead WHERE lead."id" = quote."leadId" AND lead."orgId" = quote."orgId"),
        'Legacy customer'
    ),
    "customerEmail" = COALESCE(
        (SELECT customer."email" FROM "Customer" AS customer WHERE customer."id" = quote."customerId" AND customer."orgId" = quote."orgId"),
        (SELECT lead."email" FROM "Lead" AS lead WHERE lead."id" = quote."leadId" AND lead."orgId" = quote."orgId")
    ),
    "customerAddress" = (SELECT customer."address" FROM "Customer" AS customer WHERE customer."id" = quote."customerId" AND customer."orgId" = quote."orgId"),
    "customerTaxId" = (SELECT customer."taxId" FROM "Customer" AS customer WHERE customer."id" = quote."customerId" AND customer."orgId" = quote."orgId"),
    "currentVersionNumber" = GREATEST(quote."version", 1),
    "updatedAt" = quote."createdAt";

ALTER TABLE "Quote" ALTER COLUMN "customerName" SET NOT NULL;
ALTER TABLE "Quote" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "QuoteItem"
    ADD COLUMN "description" TEXT,
    ADD COLUMN "discountType" TEXT NOT NULL DEFAULT 'percent',
    ADD COLUMN "discountValue" DECIMAL(19,4) NOT NULL DEFAULT 0,
    ADD COLUMN "listPrice" DECIMAL(19,4) NOT NULL DEFAULT 0,
    ADD COLUMN "manualPriceOverride" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "orgId" TEXT,
    ADD COLUMN "priceOverrideReason" TEXT,
    ADD COLUMN "productId" TEXT,
    ADD COLUMN "quantity" DECIMAL(19,4),
    ADD COLUMN "quoteDiscountShare" DECIMAL(19,4) NOT NULL DEFAULT 0,
    ADD COLUMN "subtotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    ADD COLUMN "tax" DECIMAL(19,4) NOT NULL DEFAULT 0,
    ADD COLUMN "taxRate" DECIMAL(9,4) NOT NULL DEFAULT 0,
    ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'each';

UPDATE "QuoteItem" AS item
SET "orgId" = quote."orgId",
    "quantity" = item."qty"::numeric(19,4),
    "listPrice" = item."unitPrice",
    "discountType" = 'fixed',
    "discountValue" = item."discount",
    "subtotal" = GREATEST(item."total" + item."discount", 0)
FROM "Quote" AS quote
WHERE quote."id" = item."quoteId";

ALTER TABLE "QuoteItem" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "QuoteItem" ALTER COLUMN "quantity" SET NOT NULL;
ALTER TABLE "QuoteItem" ALTER COLUMN "quantity" SET DEFAULT 1;
ALTER TABLE "QuoteItem" DROP COLUMN "qty";

CREATE UNIQUE INDEX "Customer_id_orgId_key" ON "Customer"("id", "orgId");
CREATE INDEX "Product_orgId_active_name_idx" ON "Product"("orgId", "active", "name");
CREATE UNIQUE INDEX "Product_id_orgId_key" ON "Product"("id", "orgId");
CREATE UNIQUE INDEX "Quote_id_orgId_key" ON "Quote"("id", "orgId");

CREATE TABLE "QuoteVersion" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "customerSnapshot" JSONB NOT NULL,
    "itemsSnapshot" JSONB NOT NULL,
    "quoteSnapshot" JSONB NOT NULL,
    "subtotal" DECIMAL(19,4) NOT NULL,
    "lineDiscount" DECIMAL(19,4) NOT NULL,
    "quoteDiscount" DECIMAL(19,4) NOT NULL,
    "tax" DECIMAL(19,4) NOT NULL,
    "total" DECIMAL(19,4) NOT NULL,
    "validUntil" TIMESTAMPTZ(3),
    "terms" TEXT,
    "notes" TEXT,
    "templateVersion" TEXT NOT NULL DEFAULT 'quote-v1',
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteApproval" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "quoteVersionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedById" TEXT,
    "decidedById" TEXT,
    "requestReason" TEXT,
    "decisionReason" TEXT,
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),
    CONSTRAINT "QuoteApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "quoteVersionId" TEXT,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteNumberCounter" (
    "orgId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "QuoteNumberCounter_pkey" PRIMARY KEY ("orgId", "year")
);

CREATE TABLE "QuoteSettings" (
    "orgId" TEXT NOT NULL,
    "numberPrefix" TEXT NOT NULL DEFAULT 'Q',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "defaultTaxRate" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "taxIncluded" BOOLEAN NOT NULL DEFAULT false,
    "defaultValidDays" INTEGER NOT NULL DEFAULT 30,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "discountThresholdPct" DECIMAL(9,4),
    "valueThreshold" DECIMAL(19,4),
    "documentTemplateVersion" TEXT NOT NULL DEFAULT 'quote-v1',
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "QuoteSettings_pkey" PRIMARY KEY ("orgId")
);

CREATE TABLE "GeneratedQuoteDocument" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "quoteVersionId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "storagePath" TEXT,
    "generatedById" TEXT,
    "generatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedQuoteDocument_pkey" PRIMARY KEY ("id")
);

INSERT INTO "QuoteSettings" ("orgId", "updatedAt")
SELECT "id", CURRENT_TIMESTAMP FROM "Organization"
ON CONFLICT ("orgId") DO NOTHING;

INSERT INTO "QuoteNumberCounter" ("orgId", "year", "nextValue", "updatedAt")
SELECT quote."orgId",
       EXTRACT(YEAR FROM quote."createdAt")::integer,
       COALESCE(MAX(CASE WHEN quote."number" ~ '[0-9]+$' THEN substring(quote."number" FROM '([0-9]+)$')::integer END), COUNT(*)::integer) + 1,
       CURRENT_TIMESTAMP
FROM "Quote" AS quote
GROUP BY quote."orgId", EXTRACT(YEAR FROM quote."createdAt")::integer
ON CONFLICT ("orgId", "year") DO NOTHING;

INSERT INTO "QuoteVersion" (
    "id", "orgId", "quoteId", "versionNumber", "status", "currency",
    "customerSnapshot", "itemsSnapshot", "quoteSnapshot", "subtotal",
    "lineDiscount", "quoteDiscount", "tax", "total", "validUntil",
    "terms", "notes", "templateVersion", "createdById", "createdAt"
)
SELECT quote."id" || '_v' || quote."currentVersionNumber"::text,
       quote."orgId", quote."id", quote."currentVersionNumber", quote."status", quote."currency",
       jsonb_build_object('customerId', quote."customerId", 'leadId', quote."leadId", 'name', quote."customerName", 'email', quote."customerEmail", 'address', quote."customerAddress", 'taxId', quote."customerTaxId"),
       COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
               'id', item."id", 'productId', item."productId", 'name', item."productName",
               'description', item."description", 'unit', item."unit", 'quantity', item."quantity"::text,
               'listPrice', item."listPrice"::text, 'unitPrice', item."unitPrice"::text,
               'discountType', item."discountType", 'discountValue', item."discountValue"::text,
               'discount', item."discount"::text, 'quoteDiscountShare', item."quoteDiscountShare"::text,
               'taxRate', item."taxRate"::text, 'tax', item."tax"::text,
               'subtotal', item."subtotal"::text, 'total', item."total"::text, 'position', item."position"
           ) ORDER BY item."position") FROM "QuoteItem" AS item WHERE item."quoteId" = quote."id"
       ), '[]'::jsonb),
       jsonb_build_object('number', quote."number", 'status', quote."status", 'currency', quote."currency", 'quoteDiscountType', quote."quoteDiscountType", 'quoteDiscountValue', quote."quoteDiscountValue"::text, 'taxRate', quote."taxRate"::text, 'taxIncluded', quote."taxIncluded", 'validUntil', quote."validUntil", 'terms', quote."terms", 'notes', quote."notes"),
       quote."subtotal", quote."lineDiscount", quote."quoteDiscount", quote."tax", quote."total",
       quote."validUntil", quote."terms", quote."notes", 'quote-v1', quote."createdById", quote."createdAt"
FROM "Quote" AS quote;

UPDATE "Quote" SET "currentVersionId" = "id" || '_v' || "currentVersionNumber"::text WHERE "currentVersionNumber" > 0;
ALTER TABLE "Quote" DROP COLUMN "parentId";
ALTER TABLE "Quote" DROP COLUMN "version";

CREATE INDEX "QuoteVersion_orgId_createdAt_idx" ON "QuoteVersion"("orgId", "createdAt");
CREATE UNIQUE INDEX "QuoteVersion_quoteId_versionNumber_key" ON "QuoteVersion"("quoteId", "versionNumber");
CREATE UNIQUE INDEX "QuoteVersion_id_quoteId_orgId_key" ON "QuoteVersion"("id", "quoteId", "orgId");
CREATE INDEX "QuoteApproval_orgId_status_requestedAt_idx" ON "QuoteApproval"("orgId", "status", "requestedAt");
CREATE INDEX "QuoteApproval_quoteId_requestedAt_idx" ON "QuoteApproval"("quoteId", "requestedAt");
CREATE UNIQUE INDEX "QuoteApproval_quoteVersionId_status_key" ON "QuoteApproval"("quoteVersionId", "status");
CREATE INDEX "QuoteEvent_quoteId_createdAt_idx" ON "QuoteEvent"("quoteId", "createdAt");
CREATE INDEX "QuoteEvent_orgId_type_createdAt_idx" ON "QuoteEvent"("orgId", "type", "createdAt");
CREATE UNIQUE INDEX "QuoteEvent_orgId_idempotencyKey_key" ON "QuoteEvent"("orgId", "idempotencyKey");
CREATE INDEX "GeneratedQuoteDocument_orgId_generatedAt_idx" ON "GeneratedQuoteDocument"("orgId", "generatedAt");
CREATE INDEX "GeneratedQuoteDocument_quoteId_generatedAt_idx" ON "GeneratedQuoteDocument"("quoteId", "generatedAt");
CREATE UNIQUE INDEX "GeneratedQuoteDocument_quoteVersionId_format_templateVersio_key" ON "GeneratedQuoteDocument"("quoteVersionId", "format", "templateVersion");
CREATE UNIQUE INDEX "Quote_currentVersionId_key" ON "Quote"("currentVersionId");
CREATE UNIQUE INDEX "Quote_sentVersionId_key" ON "Quote"("sentVersionId");
CREATE UNIQUE INDEX "Quote_acceptedVersionId_key" ON "Quote"("acceptedVersionId");
CREATE INDEX "Quote_orgId_status_updatedAt_idx" ON "Quote"("orgId", "status", "updatedAt");
CREATE INDEX "Quote_orgId_customerId_updatedAt_idx" ON "Quote"("orgId", "customerId", "updatedAt");
CREATE INDEX "Quote_orgId_ownerId_updatedAt_idx" ON "Quote"("orgId", "ownerId", "updatedAt");
CREATE INDEX "Quote_orgId_validUntil_idx" ON "Quote"("orgId", "validUntil");
CREATE INDEX "Quote_orgId_createdAt_idx" ON "Quote"("orgId", "createdAt");
CREATE INDEX "Quote_leadId_orgId_idx" ON "Quote"("leadId", "orgId");
CREATE INDEX "QuoteItem_quoteId_position_idx" ON "QuoteItem"("quoteId", "position");
CREATE INDEX "QuoteItem_orgId_productId_idx" ON "QuoteItem"("orgId", "productId");
CREATE UNIQUE INDEX "QuoteItem_id_quoteId_orgId_key" ON "QuoteItem"("id", "quoteId", "orgId");

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_leadId_orgId_fkey" FOREIGN KEY ("leadId", "orgId") REFERENCES "Lead"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_orgId_fkey" FOREIGN KEY ("customerId", "orgId") REFERENCES "Customer"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_orgId_fkey" FOREIGN KEY ("quoteId", "orgId") REFERENCES "Quote"("id", "orgId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_productId_orgId_fkey" FOREIGN KEY ("productId", "orgId") REFERENCES "Product"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_quoteId_orgId_fkey" FOREIGN KEY ("quoteId", "orgId") REFERENCES "Quote"("id", "orgId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuoteApproval" ADD CONSTRAINT "QuoteApproval_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteApproval" ADD CONSTRAINT "QuoteApproval_quoteVersionId_quoteId_orgId_fkey" FOREIGN KEY ("quoteVersionId", "quoteId", "orgId") REFERENCES "QuoteVersion"("id", "quoteId", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteApproval" ADD CONSTRAINT "QuoteApproval_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuoteApproval" ADD CONSTRAINT "QuoteApproval_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuoteEvent" ADD CONSTRAINT "QuoteEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteEvent" ADD CONSTRAINT "QuoteEvent_quoteId_orgId_fkey" FOREIGN KEY ("quoteId", "orgId") REFERENCES "Quote"("id", "orgId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteEvent" ADD CONSTRAINT "QuoteEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuoteNumberCounter" ADD CONSTRAINT "QuoteNumberCounter_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteSettings" ADD CONSTRAINT "QuoteSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedQuoteDocument" ADD CONSTRAINT "GeneratedQuoteDocument_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedQuoteDocument" ADD CONSTRAINT "GeneratedQuoteDocument_quoteVersionId_quoteId_orgId_fkey" FOREIGN KEY ("quoteVersionId", "quoteId", "orgId") REFERENCES "QuoteVersion"("id", "quoteId", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GeneratedQuoteDocument" ADD CONSTRAINT "GeneratedQuoteDocument_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "QuoteVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_sentVersionId_fkey" FOREIGN KEY ("sentVersionId") REFERENCES "QuoteVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_acceptedVersionId_fkey" FOREIGN KEY ("acceptedVersionId") REFERENCES "QuoteVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_status_check" CHECK ("status" IN ('draft','pending_approval','approved','rejected','sent','accepted','declined','expired','cancelled','archived'));
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_currency_check" CHECK ("currency" IN ('AMD','USD','EUR'));
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_nonnegative_money_check" CHECK ("subtotal" >= 0 AND "lineDiscount" >= 0 AND "quoteDiscount" >= 0 AND "discount" >= 0 AND "tax" >= 0 AND "total" >= 0);
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_discount_type_check" CHECK ("quoteDiscountType" IN ('percent','fixed'));
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_tax_rate_check" CHECK ("taxRate" >= 0 AND "taxRate" <= 100);
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_revision_check" CHECK ("revision" > 0 AND "currentVersionNumber" >= 0);
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_money_check" CHECK ("listPrice" >= 0 AND "unitPrice" >= 0 AND "discountValue" >= 0 AND "discount" >= 0 AND "quoteDiscountShare" >= 0 AND "tax" >= 0 AND "subtotal" >= 0 AND "total" >= 0);
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_discount_type_check" CHECK ("discountType" IN ('percent','fixed'));
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_tax_rate_check" CHECK ("taxRate" >= 0 AND "taxRate" <= 100);
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_number_check" CHECK ("versionNumber" > 0);
ALTER TABLE "QuoteApproval" ADD CONSTRAINT "QuoteApproval_status_check" CHECK ("status" IN ('pending','approved','rejected','cancelled'));
ALTER TABLE "QuoteNumberCounter" ADD CONSTRAINT "QuoteNumberCounter_next_check" CHECK ("nextValue" > 0);
ALTER TABLE "QuoteSettings" ADD CONSTRAINT "QuoteSettings_currency_check" CHECK ("defaultCurrency" IN ('AMD','USD','EUR'));
ALTER TABLE "QuoteSettings" ADD CONSTRAINT "QuoteSettings_values_check" CHECK ("defaultTaxRate" >= 0 AND "defaultTaxRate" <= 100 AND "defaultValidDays" BETWEEN 1 AND 3650 AND ("discountThresholdPct" IS NULL OR ("discountThresholdPct" >= 0 AND "discountThresholdPct" <= 100)) AND ("valueThreshold" IS NULL OR "valueThreshold" >= 0));
ALTER TABLE "GeneratedQuoteDocument" ADD CONSTRAINT "GeneratedQuoteDocument_format_check" CHECK ("format" IN ('pdf','docx','json'));

CREATE TRIGGER "Quote_owner_membership" BEFORE INSERT OR UPDATE OF "ownerId", "orgId" ON "Quote" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('ownerId');
CREATE TRIGGER "Quote_creator_membership" BEFORE INSERT OR UPDATE OF "createdById", "orgId" ON "Quote" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('createdById');
CREATE TRIGGER "QuoteVersion_creator_membership" BEFORE INSERT OR UPDATE OF "createdById", "orgId" ON "QuoteVersion" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('createdById');
CREATE TRIGGER "QuoteApproval_requester_membership" BEFORE INSERT OR UPDATE OF "requestedById", "orgId" ON "QuoteApproval" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('requestedById');
CREATE TRIGGER "QuoteApproval_decider_membership" BEFORE INSERT OR UPDATE OF "decidedById", "orgId" ON "QuoteApproval" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('decidedById');
CREATE TRIGGER "QuoteEvent_actor_membership" BEFORE INSERT OR UPDATE OF "actorId", "orgId" ON "QuoteEvent" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('actorId');
CREATE TRIGGER "GeneratedQuoteDocument_generator_membership" BEFORE INSERT OR UPDATE OF "generatedById", "orgId" ON "GeneratedQuoteDocument" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('generatedById');

CREATE FUNCTION public.haydev_assert_quote_version_links()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE linked RECORD;
DECLARE version_column TEXT;
BEGIN
    FOREACH version_column IN ARRAY ARRAY['currentVersionId','sentVersionId','acceptedVersionId'] LOOP
        IF to_jsonb(NEW) ->> version_column IS NULL THEN CONTINUE; END IF;
        SELECT "quoteId", "orgId" INTO linked FROM public."QuoteVersion" WHERE "id" = to_jsonb(NEW) ->> version_column;
        IF NOT FOUND OR linked."quoteId" <> NEW."id" OR linked."orgId" <> NEW."orgId" THEN
            RAISE EXCEPTION 'Quote version link must reference the same quote and tenant';
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "Quote_version_links_same_quote" BEFORE INSERT OR UPDATE OF "currentVersionId", "sentVersionId", "acceptedVersionId", "orgId" ON "Quote" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_quote_version_links();

CREATE FUNCTION public.haydev_protect_quote_approval()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
    IF current_user <> 'haydev_runtime' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Quote approval history is append-only'; END IF;
    IF OLD."status" <> 'pending' THEN RAISE EXCEPTION 'Decided quote approvals are immutable'; END IF;
    IF NEW."orgId" <> OLD."orgId" OR NEW."quoteId" <> OLD."quoteId" OR NEW."quoteVersionId" <> OLD."quoteVersionId" OR NEW."requestedById" IS DISTINCT FROM OLD."requestedById" OR NEW."requestedAt" <> OLD."requestedAt" THEN
        RAISE EXCEPTION 'Quote approval identity is immutable';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "QuoteVersion_runtime_immutable" BEFORE UPDATE OR DELETE ON "QuoteVersion" FOR EACH ROW EXECUTE FUNCTION public.haydev_prevent_runtime_history_mutation();
CREATE TRIGGER "QuoteEvent_runtime_immutable" BEFORE UPDATE OR DELETE ON "QuoteEvent" FOR EACH ROW EXECUTE FUNCTION public.haydev_prevent_runtime_history_mutation();
CREATE TRIGGER "GeneratedQuoteDocument_runtime_immutable" BEFORE UPDATE OR DELETE ON "GeneratedQuoteDocument" FOR EACH ROW EXECUTE FUNCTION public.haydev_prevent_runtime_history_mutation();
CREATE TRIGGER "QuoteApproval_runtime_protected" BEFORE UPDATE OR DELETE ON "QuoteApproval" FOR EACH ROW EXECUTE FUNCTION public.haydev_protect_quote_approval();

DO $$
DECLARE table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['QuoteVersion','QuoteApproval','QuoteEvent','QuoteNumberCounter','QuoteSettings','GeneratedQuoteDocument'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('DROP POLICY IF EXISTS haydev_runtime_server_access ON public.%I', table_name);
        EXECUTE format('CREATE POLICY haydev_runtime_server_access ON public.%I FOR ALL TO haydev_runtime USING (true) WITH CHECK (true)', table_name);
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', table_name);
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM authenticated', table_name);
        END IF;
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO haydev_runtime', table_name);
    END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.haydev_assert_quote_version_links() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.haydev_protect_quote_approval() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.haydev_assert_quote_version_links() TO haydev_runtime;
GRANT EXECUTE ON FUNCTION public.haydev_protect_quote_approval() TO haydev_runtime;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL PRIVILEGES ON TABLE public."Quote", public."QuoteItem", public."Product", public."Customer" FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL PRIVILEGES ON TABLE public."Quote", public."QuoteItem", public."Product", public."Customer" FROM authenticated;
    END IF;
END;
$$;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."Quote", public."QuoteItem", public."Product", public."Customer" TO haydev_runtime;
