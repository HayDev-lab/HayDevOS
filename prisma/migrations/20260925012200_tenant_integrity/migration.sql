BEGIN;

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_orgId_provider_eventId_key" ON "WebhookEvent"("orgId", "provider", "eventId");

-- Reject a relationship whose parent belongs to another organization. This is
-- defense in depth for the server-side orgId checks and does not expose the
-- parent organization's identifier in the error.
CREATE FUNCTION public.haydev_assert_same_org()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    parent_id TEXT;
    parent_org_id TEXT;
BEGIN
    parent_id := to_jsonb(NEW) ->> TG_ARGV[0];
    IF parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    EXECUTE format(
        'SELECT "orgId" FROM public.%I WHERE "id" = $1',
        TG_ARGV[1]
    ) INTO parent_org_id USING parent_id;

    IF parent_org_id IS NULL THEN
        RAISE EXCEPTION 'Referenced tenant record does not exist'
            USING ERRCODE = '23503';
    END IF;

    IF parent_org_id <> NEW."orgId" THEN
        RAISE EXCEPTION 'Cross-tenant reference rejected for %', TG_TABLE_NAME
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "LeadActivity_same_org"
BEFORE INSERT OR UPDATE OF "leadId", "orgId" ON "LeadActivity"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_same_org('leadId', 'Lead');

CREATE TRIGGER "Task_lead_same_org"
BEFORE INSERT OR UPDATE OF "leadId", "orgId" ON "Task"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_same_org('leadId', 'Lead');

CREATE TRIGGER "Quote_lead_same_org"
BEFORE INSERT OR UPDATE OF "leadId", "orgId" ON "Quote"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_same_org('leadId', 'Lead');

CREATE TRIGGER "AutomationRun_same_org"
BEFORE INSERT OR UPDATE OF "automationId", "orgId" ON "AutomationRun"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_same_org('automationId', 'Automation');

CREATE TRIGGER "Order_customer_same_org"
BEFORE INSERT OR UPDATE OF "customerId", "orgId" ON "Order"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_same_org('customerId', 'Customer');

CREATE TRIGGER "Invoice_customer_same_org"
BEFORE INSERT OR UPDATE OF "customerId", "orgId" ON "Invoice"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_same_org('customerId', 'Customer');

CREATE TRIGGER "Invoice_order_same_org"
BEFORE INSERT OR UPDATE OF "orderId", "orgId" ON "Invoice"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_same_org('orderId', 'Order');

CREATE TRIGGER "Payment_invoice_same_org"
BEFORE INSERT OR UPDATE OF "invoiceId", "orgId" ON "Payment"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_same_org('invoiceId', 'Invoice');

-- User references on tenant-owned records must resolve to a current membership.
CREATE FUNCTION public.haydev_assert_org_membership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    referenced_user_id TEXT;
BEGIN
    referenced_user_id := to_jsonb(NEW) ->> TG_ARGV[0];
    IF referenced_user_id IS NULL OR NEW."orgId" IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public."Membership"
        WHERE "userId" = referenced_user_id
          AND "orgId" = NEW."orgId"
    ) THEN
        RAISE EXCEPTION 'Tenant membership required for %', TG_TABLE_NAME
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "Session_user_membership"
BEFORE INSERT OR UPDATE OF "userId", "orgId" ON "Session"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('userId');

CREATE TRIGGER "Notification_user_membership"
BEFORE INSERT OR UPDATE OF "userId", "orgId" ON "Notification"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('userId');

CREATE TRIGGER "Lead_owner_membership"
BEFORE INSERT OR UPDATE OF "ownerId", "orgId" ON "Lead"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('ownerId');

CREATE TRIGGER "Task_assignee_membership"
BEFORE INSERT OR UPDATE OF "assigneeId", "orgId" ON "Task"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('assigneeId');

CREATE TRIGGER "Task_owner_membership"
BEFORE INSERT OR UPDATE OF "ownerId", "orgId" ON "Task"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('ownerId');

CREATE TRIGGER "DocumentRecord_uploader_membership"
BEFORE INSERT OR UPDATE OF "uploadedById", "orgId" ON "DocumentRecord"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('uploadedById');

CREATE TRIGGER "AiConversation_user_membership"
BEFORE INSERT OR UPDATE OF "userId", "orgId" ON "AiConversation"
FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('userId');

-- A removed membership invalidates only sessions scoped to that organization.
CREATE FUNCTION public.haydev_revoke_membership_sessions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    DELETE FROM public."Session"
    WHERE "userId" = OLD."userId"
      AND "orgId" = OLD."orgId";
    RETURN OLD;
END;
$$;

CREATE TRIGGER "Membership_revoke_sessions"
AFTER DELETE OR UPDATE OF "userId", "orgId" ON "Membership"
FOR EACH ROW EXECUTE FUNCTION public.haydev_revoke_membership_sessions();

-- Preserve the custom-auth case-insensitive email invariant in PostgreSQL.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower("email"));

COMMIT;
