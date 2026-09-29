WITH expected(migration_name, checksum) AS (
    VALUES
        ('20260925011923_initial_postgresql', '49d844d7f989d2f2ef9b6e4a42906414e2f776278bc59f32637d969670940fec'),
        ('20260925012200_tenant_integrity', '3c5fc58706799759d64c39cea15a6b585a25e4ba775cc37df067a5667e93d3f2'),
        ('20260925012300_runtime_security', '08f907ac8653ced9288d44ec79379d6a61ec8dc93a0468b92529c6da30fdebec'),
        ('20260925012400_runtime_rls_policy', '8c94995dc7dfb09dcd301903470d7f6e42251d3d18e50a94f8f2dc50fc709a32'),
        ('20260925012500_harden_managed_rls_hook', '72d9d179f5a40a0b3567f30a3587f3f161380f2960e058eee416bc0b5b623785'),
        ('20260925030000_leados_production_domain', '25c79d5bfe65f55904b1a1993eaf9ec9e08bc3b1a0f4a887c2ef6d2198e0957a'),
        ('20260925070000_quoteflow_production_domain', '26b1dfb7912fe092e09db4b39a0bf6ebe9c4746ba04a1fe971d5094964552e70'),
        ('20260925110000_documentflow_production_domain', 'cdd0a25da8b46283d757c6214decc613838fc427e80b62c20c7f24fa9587105f'),
        ('20260925150000_erp_production_domain', '60e2f49b41827a9d8ab89361023c4807fe78428c7d1db9baf7f09bdfae3cf678')
)
SELECT
    count(*) AS expected_migrations,
    count(*) FILTER (
        WHERE actual."checksum" = expected.checksum
          AND actual."finished_at" IS NOT NULL
          AND actual."rolled_back_at" IS NULL
    ) AS matching_migrations
FROM expected
LEFT JOIN public."_prisma_migrations" AS actual
  ON actual."migration_name" = expected.migration_name;
