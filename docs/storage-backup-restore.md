# Document Storage backup and restore

PostgreSQL and Supabase Storage form one logical system of record. A database dump alone is not a document backup: it contains object keys and hashes, not file bytes.

## Backup set

Capture these under one backup identifier and timestamp:

1. A PostgreSQL/PITR checkpoint containing `DocumentRecord`, `DocumentVersion`, `DocumentTemplate`, `DocumentGeneration`, `DocumentAccessEvent`, `GeneratedQuoteDocument`, audit rows, and `_prisma_migrations`.
2. A version-preserving export of the private `haydev-documents` bucket.
3. A manifest containing bucket/key, size, SHA-256, document/version IDs, backup timestamp, schema migration checksum, and object export location.
4. Encrypted deployment configuration references. Never place actual Storage or database secrets in the manifest.

Use provider-native bucket backup/replication where available. If exporting through the Storage API, page recursively, stream objects, verify each object against `DocumentVersion.sha256`, encrypt the archive, and treat any mismatch as a failed backup.

## Pre-migration procedure

1. Quiesce document uploads/generation or record a precise cutoff.
2. Create the database backup described in `docs/database-backup-restore.md`.
3. Export the private bucket and build the checksum manifest.
4. Run `npm run storage:reconcile -- --hash`; the result must contain no missing objects, mismatches, or orphans.
5. Restore both halves into an isolated Supabase project and run the full DocumentFlow HTTP suite before declaring the backup usable.

## Restore order

1. Put HayDevOS in maintenance mode and stop all document writers/workers.
2. Restore PostgreSQL into a new isolated target and apply only committed migrations.
3. Recreate `haydev-documents` as private with the committed 25 MB/MIME configuration.
4. Restore objects at their exact immutable keys with overwrite disabled. A key collision is an incident, not permission to overwrite.
5. Run full hash reconciliation. Do not route traffic until missing, mismatch, and orphan counts are zero.
6. Test session/tenant denial, quarantined upload denial, PDF/DOCX download, Owner AI access, archive approval, and restart persistence.
7. Rotate runtime and Storage credentials, then route traffic to the restored target.

## Partial failure rules

- Metadata without bytes: keep the version unavailable, investigate the backup/object lifecycle, and never synthesize a replacement under the same version/hash.
- Bytes without metadata: quarantine as an orphan; do not expose or delete until ownership and retention are reviewed.
- Hash mismatch: block access, preserve both copies for forensics, and restore only from a verified source.
- Interrupted upload/generation: use the reconciliation report and audit trail; create a new version for retries rather than mutating immutable evidence.

Restore drills should be scheduled and timed. Record the recovered object count, total bytes, checksum result, migration checksum, RPO/RTO, and test evidence.
