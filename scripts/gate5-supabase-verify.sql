SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'haydev-documents';

SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

SELECT
  (SELECT COUNT(*) FROM public."DocumentRecord") AS document_records,
  (SELECT COUNT(*) FROM public."DocumentVersion") AS document_versions,
  (SELECT COUNT(*) FROM public."DocumentTemplate") AS document_templates,
  (SELECT COUNT(*) FROM public."DocumentGeneration") AS document_generations,
  (SELECT COUNT(*) FROM public."DocumentAccessEvent") AS document_access_events,
  (SELECT COUNT(*) FROM public."GeneratedQuoteDocument") AS generated_quote_documents,
  (SELECT COUNT(*) FROM storage.buckets WHERE id = 'haydev-documents' AND public = false AND file_size_limit = 26214400) AS private_bucket_match,
  (SELECT COUNT(*) FROM public._prisma_migrations WHERE migration_name = '20260925110000_documentflow_production_domain' AND finished_at IS NOT NULL AND rolled_back_at IS NULL AND checksum = 'cdd0a25da8b46283d757c6214decc613838fc427e80b62c20c7f24fa9587105f') AS gate5_ledger_match,
  (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname IN ('DocumentRecord','DocumentVersion','DocumentTemplate','DocumentGeneration','DocumentAccessEvent','GeneratedQuoteDocument') AND c.relrowsecurity) AS document_rls_tables,
  (SELECT COUNT(*) FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name IN ('DocumentRecord','DocumentVersion','DocumentTemplate','DocumentGeneration','DocumentAccessEvent','GeneratedQuoteDocument') AND grantee IN ('anon','authenticated')) AS browser_document_grants,
  (SELECT COUNT(*) FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name IN ('DocumentRecord','DocumentVersion','DocumentTemplate','DocumentGeneration','DocumentAccessEvent','GeneratedQuoteDocument') AND grantee = 'haydev_runtime') AS runtime_document_grants,
  (SELECT COUNT(*) FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conname IN ('DocumentVersion_documentId_orgId_fkey','DocumentGeneration_documentVersionId_documentId_orgId_fkey','DocumentGeneration_quoteVersionId_quoteId_orgId_fkey','DocumentAccessEvent_documentVersionId_documentId_orgId_fkey','GeneratedQuoteDocument_documentVersionId_documentId_orgId_fkey')) AS tenant_fk_constraints,
  (SELECT COUNT(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname IN ('DocumentRecord_source_tenant','DocumentRecord_current_version_same_document','DocumentVersion_runtime_protected','DocumentGeneration_runtime_protected','DocumentTemplate_runtime_immutable','DocumentAccessEvent_runtime_immutable')) AS document_security_triggers,
  (SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls FROM pg_roles WHERE rolname = 'haydev_runtime') AS runtime_has_elevated_privilege;
