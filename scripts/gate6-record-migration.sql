DO $$
DECLARE existing_checksum TEXT;
BEGIN
  SELECT checksum INTO existing_checksum FROM public._prisma_migrations
  WHERE migration_name = '20260925150000_erp_production_domain';
  IF existing_checksum IS NULL THEN
    INSERT INTO public._prisma_migrations (
      id, checksum, finished_at, migration_name, logs,
      rolled_back_at, started_at, applied_steps_count
    ) VALUES (
      gen_random_uuid()::text,
      '60e2f49b41827a9d8ab89361023c4807fe78428c7d1db9baf7f09bdfae3cf678',
      NOW(), '20260925150000_erp_production_domain', NULL, NULL, NOW(), 1
    );
  ELSIF existing_checksum <> '60e2f49b41827a9d8ab89361023c4807fe78428c7d1db9baf7f09bdfae3cf678' THEN
    RAISE EXCEPTION 'Gate 6 migration checksum mismatch';
  END IF;
END;
$$;
