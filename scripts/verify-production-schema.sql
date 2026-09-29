SELECT
    current_database() AS database_name,
    current_setting('server_version') AS server_version,
    to_regclass('public."User"') IS NOT NULL AS haydev_schema_exists,
    (SELECT count(*) FROM public."_prisma_migrations" WHERE "finished_at" IS NOT NULL) AS applied_migrations,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS public_tables,
    (SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE '%_same_org') AS same_org_triggers,
    (SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE '%_membership') AS membership_triggers,
    (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND policyname = 'haydev_runtime_server_access') AS runtime_rls_policies,
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity) AS rls_enabled_tables,
    (SELECT count(*) FROM public."User") AS users,
    (SELECT count(*) FROM public."Organization") AS organizations,
    (SELECT count(*) FROM public."AuthThrottle") AS auth_throttles,
    (SELECT NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls AND NOT rolcanlogin FROM pg_roles WHERE rolname = 'haydev_runtime') AS runtime_role_restricted,
    has_table_privilege('haydev_runtime', 'public."User"', 'SELECT') AS runtime_can_select,
    has_schema_privilege('haydev_runtime', 'public', 'CREATE') AS runtime_can_create,
    has_table_privilege('haydev_runtime', 'public."_prisma_migrations"', 'SELECT') AS runtime_can_read_migrations,
    (
        SELECT count(*)
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND grantee IN ('anon', 'authenticated')
    ) AS exposed_role_table_grants;
