-- Read-only production evidence. Safe to run with:
-- npx supabase db query --linked --file scripts/production-database-audit.sql --output json

WITH tenant_security AS (
  SELECT
    count(*)::integer AS tenant_tables,
    count(*) FILTER (WHERE c.relrowsecurity)::integer AS rls_enabled_tables,
    count(*) FILTER (WHERE c.relforcerowsecurity)::integer AS force_rls_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns col
      WHERE col.table_schema = 'public'
        AND col.table_name = c.relname
        AND col.column_name = 'orgId'
    )
), migration_state AS (
  SELECT
    count(*)::integer AS migration_rows,
    count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::integer AS applied_migrations,
    count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::integer AS failed_or_incomplete_migrations
  FROM "_prisma_migrations"
), runtime_role AS (
  SELECT
    rolname,
    rolsuper,
    rolcreatedb,
    rolcreaterole,
    rolbypassrls,
    rolcanlogin
  FROM pg_roles
  WHERE rolname = 'haydev_runtime'
)
SELECT
  current_setting('server_version') AS server_version,
  current_database() AS database_name,
  current_setting('ssl') AS ssl_enabled,
  row_to_json(runtime_role) AS runtime_role,
  row_to_json(migration_state) AS migrations,
  row_to_json(tenant_security) AS tenant_security,
  (SELECT count(*) FROM "Organization")::integer AS organizations,
  (SELECT count(*) FROM "User")::integer AS users,
  (SELECT count(*) FROM "Membership")::integer AS memberships,
  (SELECT count(*) FROM "Lead")::integer AS leads,
  (SELECT count(*) FROM "Quote")::integer AS quotes,
  (SELECT count(*) FROM "DocumentRecord")::integer AS documents,
  (SELECT count(*) FROM "Order")::integer AS orders
FROM tenant_security, migration_state
LEFT JOIN runtime_role ON true;
