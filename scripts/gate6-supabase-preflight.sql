SELECT current_database() AS database_name, current_user AS migration_user;

SELECT migration_name, checksum, finished_at IS NOT NULL AS finished
FROM public._prisma_migrations
ORDER BY started_at;

SELECT
  (SELECT COUNT(*) FROM public."Organization") AS organizations,
  (SELECT COUNT(*) FROM public."User") AS users,
  (SELECT COUNT(*) FROM public."Customer") AS customers,
  (SELECT COUNT(*) FROM public."Product") AS products,
  (SELECT COUNT(*) FROM public."Quote") AS quotes,
  (SELECT COUNT(*) FROM public."QuoteVersion") AS quote_versions,
  (SELECT COUNT(*) FROM public."Order") AS orders,
  (SELECT COUNT(*) FROM public."Invoice") AS invoices,
  (SELECT COUNT(*) FROM public."Payment") AS payments,
  (SELECT COUNT(*) FROM public."DocumentRecord") AS documents,
  (SELECT COUNT(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS finished_migrations;

SELECT
  (SELECT COUNT(*) FROM public."Organization") AS organizations,
  (SELECT COUNT(*) FROM public."User") AS users,
  (SELECT COUNT(*) FROM public."Customer") AS customers,
  (SELECT COUNT(*) FROM public."Product") AS products,
  (SELECT COUNT(*) FROM public."Quote") AS quotes,
  (SELECT COUNT(*) FROM public."QuoteVersion") AS quote_versions,
  (SELECT COUNT(*) FROM public."Order") AS orders,
  (SELECT COUNT(*) FROM public."Invoice") AS invoices,
  (SELECT COUNT(*) FROM public."Payment") AS payments,
  (SELECT COUNT(*) FROM public."DocumentRecord") AS documents,
  (SELECT COUNT(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS finished_migrations,
  (SELECT COUNT(*) FROM public."Order" o LEFT JOIN public."Customer" c ON c.id=o."customerId" AND c."orgId"=o."orgId" WHERE c.id IS NULL) AS order_customer_tenant_orphans,
  (SELECT COUNT(*) FROM public."Invoice" i LEFT JOIN public."Customer" c ON c.id=i."customerId" AND c."orgId"=i."orgId" WHERE c.id IS NULL) AS invoice_customer_tenant_orphans,
  (SELECT COUNT(*) FROM public."Invoice" i LEFT JOIN public."Order" o ON o.id=i."orderId" AND o."orgId"=i."orgId" WHERE i."orderId" IS NOT NULL AND o.id IS NULL) AS invoice_order_tenant_orphans,
  (SELECT COUNT(*) FROM public."Payment" p LEFT JOIN public."Invoice" i ON i.id=p."invoiceId" AND i."orgId"=p."orgId" WHERE i.id IS NULL) AS payment_invoice_tenant_orphans,
  (SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls FROM pg_roles WHERE rolname='haydev_runtime') AS runtime_has_elevated_privilege;
