SELECT current_database() AS database_name, current_user AS migration_user;
SELECT migration_name, checksum, finished_at IS NOT NULL AS finished
FROM public._prisma_migrations
ORDER BY started_at;
SELECT
  (SELECT COUNT(*) FROM public."Organization") AS organizations,
  (SELECT COUNT(*) FROM public."User") AS users,
  (SELECT COUNT(*) FROM public."DocumentRecord") AS document_records,
  (SELECT COUNT(*) FROM public."GeneratedQuoteDocument") AS generated_quote_documents,
  (SELECT COUNT(*) FROM storage.buckets WHERE id = 'haydev-documents') AS document_buckets,
  (SELECT COUNT(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS finished_migrations;
