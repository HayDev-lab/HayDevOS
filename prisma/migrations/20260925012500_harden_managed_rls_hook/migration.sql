BEGIN;

-- Hosted Supabase may install this event-trigger helper in public. It does not
-- need to be callable through PostgREST RPC by browser roles.
DO $$
DECLARE
    exposed_role TEXT;
BEGIN
    IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
        REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
        FOREACH exposed_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = exposed_role) THEN
                EXECUTE format(
                    'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM %I',
                    exposed_role
                );
            END IF;
        END LOOP;
    END IF;
END;
$$;

COMMIT;
