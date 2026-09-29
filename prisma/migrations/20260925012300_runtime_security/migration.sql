BEGIN;

-- The runtime role is created without a login. Set its password out of band
-- after migrations, then use it only in the server-side DATABASE_URL.
DO $$
DECLARE
    unsafe_role BOOLEAN;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'haydev_runtime') THEN
        SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls
        INTO unsafe_role
        FROM pg_roles
        WHERE rolname = 'haydev_runtime';
        IF unsafe_role THEN
            RAISE EXCEPTION 'Existing haydev_runtime role has elevated privileges';
        END IF;
    ELSE
        CREATE ROLE haydev_runtime
            NOLOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOINHERIT
            NOBYPASSRLS
            CONNECTION LIMIT 20;
    END IF;
END;
$$;
ALTER ROLE haydev_runtime SET search_path = public, pg_catalog;
ALTER ROLE haydev_runtime SET statement_timeout = '30s';
ALTER ROLE haydev_runtime SET idle_in_transaction_session_timeout = '15s';

DO $$
BEGIN
    EXECUTE format(
        'GRANT CONNECT ON DATABASE %I TO haydev_runtime',
        current_database()
    );
END;
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO haydev_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO haydev_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO haydev_runtime;
DO $$
BEGIN
    IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
        REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM haydev_runtime;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.haydev_assert_same_org() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.haydev_assert_org_membership() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.haydev_revoke_membership_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.haydev_assert_same_org() TO haydev_runtime;
GRANT EXECUTE ON FUNCTION public.haydev_assert_org_membership() TO haydev_runtime;
GRANT EXECUTE ON FUNCTION public.haydev_revoke_membership_sessions() TO haydev_runtime;

-- Future Prisma tables inherit runtime DML without granting schema ownership.
DO $$
BEGIN
    EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO haydev_runtime',
        current_user
    );
    EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO haydev_runtime',
        current_user
    );
END;
$$;

-- This application has no browser-to-database path. Remove PostgREST roles'
-- access when those Supabase-managed roles are present, and keep future tables
-- private by default.
DO $$
DECLARE
    exposed_role TEXT;
BEGIN
    FOREACH exposed_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = exposed_role) THEN
            EXECUTE format(
                'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I',
                exposed_role
            );
            EXECUTE format(
                'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I',
                exposed_role
            );
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM %I',
                current_user,
                exposed_role
            );
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I',
                current_user,
                exposed_role
            );
        END IF;
    END LOOP;
END;
$$;

COMMIT;
