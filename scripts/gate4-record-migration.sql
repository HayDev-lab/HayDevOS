DO $$
DECLARE existing_checksum TEXT;
BEGIN
  SELECT checksum INTO existing_checksum
  FROM public._prisma_migrations
  WHERE migration_name = '20260925070000_quoteflow_production_domain';

  IF existing_checksum IS NULL THEN
    INSERT INTO public._prisma_migrations (
      id, checksum, finished_at, migration_name, logs,
      rolled_back_at, started_at, applied_steps_count
    ) VALUES (
      gen_random_uuid()::text,
      '26b1dfb7912fe092e09db4b39a0bf6ebe9c4746ba04a1fe971d5094964552e70',
      NOW(),
      '20260925070000_quoteflow_production_domain',
      NULL,
      NULL,
      NOW(),
      1
    );
  ELSIF existing_checksum <> '26b1dfb7912fe092e09db4b39a0bf6ebe9c4746ba04a1fe971d5094964552e70' THEN
    RAISE EXCEPTION 'Gate 4 migration checksum mismatch';
  END IF;
END;
$$;
