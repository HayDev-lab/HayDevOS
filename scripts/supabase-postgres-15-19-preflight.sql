-- Read-only detection for the Supabase PostgreSQL 15.19 / 17.11 breaking-change notice.
-- Published 2026-09-25: ltree, legacy pgcrypto ciphers, btree_gist float indexes,
-- and custom operators with non-built-in selectivity estimators.
WITH ltree_indexes AS (
    SELECT DISTINCT idx.indexrelid
    FROM pg_index AS idx
    JOIN pg_class AS index_class ON index_class.oid = idx.indexrelid
    JOIN LATERAL unnest(idx.indclass::oid[]) WITH ORDINALITY AS key(opclass, position) ON true
    JOIN pg_opclass AS operator_class ON operator_class.oid = key.opclass
    JOIN pg_type AS indexed_type ON indexed_type.oid = operator_class.opcintype
    WHERE key.position <= idx.indnkeyatts
      AND indexed_type.typname IN ('ltree', '_ltree')
),
btree_gist_float_indexes AS (
    SELECT DISTINCT idx.indexrelid
    FROM pg_index AS idx
    JOIN pg_class AS index_class ON index_class.oid = idx.indexrelid
    JOIN pg_am AS access_method ON access_method.oid = index_class.relam
    JOIN LATERAL unnest(idx.indclass::oid[]) WITH ORDINALITY AS key(opclass, position) ON true
    JOIN pg_opclass AS operator_class ON operator_class.oid = key.opclass
    JOIN pg_type AS indexed_type ON indexed_type.oid = operator_class.opcintype
    WHERE access_method.amname = 'gist'
      AND key.position <= idx.indnkeyatts
      AND indexed_type.typname IN ('float4', 'float8')
),
affected_custom_operators AS (
    SELECT operator.oid
    FROM pg_operator AS operator
    JOIN pg_namespace AS namespace ON namespace.oid = operator.oprnamespace
    WHERE namespace.nspname NOT IN ('pg_catalog', 'information_schema')
      AND (
        (operator.oprrest <> 0 AND operator.oprrest::oid >= 10000)
        OR (operator.oprjoin <> 0 AND operator.oprjoin::oid >= 10000)
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend AS dependency
        WHERE dependency.classid = 'pg_operator'::regclass
          AND dependency.objid = operator.oid
          AND dependency.deptype = 'e'
      )
),
public_bytea_columns AS (
    SELECT attribute.attrelid, attribute.attnum
    FROM pg_attribute AS attribute
    JOIN pg_class AS relation ON relation.oid = attribute.attrelid
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    JOIN pg_type AS column_type ON column_type.oid = attribute.atttypid
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
      AND column_type.typname = 'bytea'
)
SELECT
    current_setting('server_version') AS server_version,
    (SELECT count(*)::int FROM ltree_indexes) AS ltree_indexes,
    (SELECT count(*)::int FROM btree_gist_float_indexes) AS btree_gist_float_indexes,
    (SELECT count(*)::int FROM affected_custom_operators) AS affected_custom_operators,
    (SELECT count(*)::int FROM public_bytea_columns) AS public_bytea_columns,
    EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') AS pgcrypto_installed,
    EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'ltree') AS ltree_installed,
    EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') AS btree_gist_installed;
