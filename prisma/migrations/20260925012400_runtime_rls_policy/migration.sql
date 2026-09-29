BEGIN;

-- Supabase enables RLS on public-schema tables created through its management
-- path. Keep that deny-by-default boundary and grant only the private Prisma
-- runtime role a server policy. Browser/Data API roles receive no policy.
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'User',
        'Organization',
        'Membership',
        'Session',
        'AuthThrottle',
        'AuditLog',
        'Notification',
        'ModuleRegistry',
        'Lead',
        'LeadActivity',
        'Task',
        'Quote',
        'QuoteItem',
        'Product',
        'PriceBook',
        'DocumentRecord',
        'DocumentField',
        'Automation',
        'AutomationRun',
        'Customer',
        'Order',
        'Invoice',
        'Payment',
        'Integration',
        'WebhookEvent',
        'AuditQuestionnaire',
        'AiConversation',
        'AiMessage'
    ] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format(
            'CREATE POLICY haydev_runtime_server_access ON public.%I FOR ALL TO haydev_runtime USING (true) WITH CHECK (true)',
            table_name
        );
    END LOOP;
END;
$$;

COMMIT;
