BEGIN;

-- The initial cutover adjusted this migration before release so it also works
-- in Prisma shadow databases where the ledger table is absent.
UPDATE public."_prisma_migrations"
SET "checksum" = '08f907ac8653ced9288d44ec79379d6a61ec8dc93a0468b92529c6da30fdebec'
WHERE "migration_name" = '20260925012300_runtime_security'
  AND "checksum" = 'fcbd36a5f4b8ba20e47d0bbdf29fe38ff47a50dc209ac59b32a4a93c7d3fd42e';

INSERT INTO public."_prisma_migrations" (
    "id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count"
)
SELECT
    '20260925-0119-4230-8000-000000000001',
    '49d844d7f989d2f2ef9b6e4a42906414e2f776278bc59f32637d969670940fec',
    now(),
    '20260925011923_initial_postgresql',
    now(),
    1
WHERE NOT EXISTS (
    SELECT 1 FROM public."_prisma_migrations"
    WHERE "migration_name" = '20260925011923_initial_postgresql'
);

INSERT INTO public."_prisma_migrations" (
    "id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count"
)
SELECT
    '20260925-0122-4230-8000-000000000002',
    '3c5fc58706799759d64c39cea15a6b585a25e4ba775cc37df067a5667e93d3f2',
    now(),
    '20260925012200_tenant_integrity',
    now(),
    1
WHERE NOT EXISTS (
    SELECT 1 FROM public."_prisma_migrations"
    WHERE "migration_name" = '20260925012200_tenant_integrity'
);

INSERT INTO public."_prisma_migrations" (
    "id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count"
)
SELECT
    '20260925-0123-4230-8000-000000000003',
    '08f907ac8653ced9288d44ec79379d6a61ec8dc93a0468b92529c6da30fdebec',
    now(),
    '20260925012300_runtime_security',
    now(),
    1
WHERE NOT EXISTS (
    SELECT 1 FROM public."_prisma_migrations"
    WHERE "migration_name" = '20260925012300_runtime_security'
);

INSERT INTO public."_prisma_migrations" (
    "id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count"
)
SELECT
    '20260925-0124-4230-8000-000000000004',
    '8c94995dc7dfb09dcd301903470d7f6e42251d3d18e50a94f8f2dc50fc709a32',
    now(),
    '20260925012400_runtime_rls_policy',
    now(),
    1
WHERE NOT EXISTS (
    SELECT 1 FROM public."_prisma_migrations"
    WHERE "migration_name" = '20260925012400_runtime_rls_policy'
);

INSERT INTO public."_prisma_migrations" (
    "id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count"
)
SELECT
    '20260925-0125-4230-8000-000000000005',
    '72d9d179f5a40a0b3567f30a3587f3f161380f2960e058eee416bc0b5b623785',
    now(),
    '20260925012500_harden_managed_rls_hook',
    now(),
    1
WHERE NOT EXISTS (
    SELECT 1 FROM public."_prisma_migrations"
    WHERE "migration_name" = '20260925012500_harden_managed_rls_hook'
);

COMMIT;
