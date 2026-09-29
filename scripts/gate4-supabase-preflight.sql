SELECT current_database() AS database_name, current_user AS migration_user;
SELECT COUNT(*) AS organizations FROM public."Organization";
SELECT COUNT(*) AS users FROM public."User";
SELECT COUNT(*) AS quotes FROM public."Quote";
SELECT
  migration_name,
  finished_at IS NOT NULL AS finished,
  checksum AS checksum_hex
FROM public._prisma_migrations
ORDER BY started_at;
SELECT
  current_database() AS database_name,
  current_user AS migration_user,
  (SELECT COUNT(*) FROM public."Organization") AS organizations,
  (SELECT COUNT(*) FROM public."User") AS users,
  (SELECT COUNT(*) FROM public."Quote") AS quotes,
  (SELECT COUNT(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL) AS finished_migrations;
