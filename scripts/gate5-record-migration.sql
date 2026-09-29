DO $$
DECLARE existing_checksum TEXT;
BEGIN
  SELECT checksum INTO existing_checksum
  FROM public._prisma_migrations
  WHERE migration_name = '20260925110000_documentflow_production_domain';

  IF existing_checksum IS NULL THEN
    INSERT INTO public._prisma_migrations (
      id, checksum, finished_at, migration_name, logs,
      rolled_back_at, started_at, applied_steps_count
    ) VALUES (
      gen_random_uuid()::text,
      'cdd0a25da8b46283d757c6214decc613838fc427e80b62c20c7f24fa9587105f',
      NOW(),
      '20260925110000_documentflow_production_domain',
      NULL, NULL, NOW(), 1
    );
  ELSIF existing_checksum <> 'cdd0a25da8b46283d757c6214decc613838fc427e80b62c20c7f24fa9587105f' THEN
    RAISE EXCEPTION 'Gate 5 migration checksum mismatch';
  END IF;
END;
$$;
