# Secret rotation

## General sequence

1. Classify scope and assume exposure if a value appeared in chat, Git, logs, client JavaScript, screenshots or shell history.
2. Create a replacement in the provider, install it in the encrypted hosting store, redeploy/restart, and verify health plus the affected workflow.
3. Revoke the old credential, prove it is invalid without printing either value, and review provider/application audit logs from the exposure time.
4. Remove cached copies and rotate dependent sessions when relevant. Record owner, time and evidence, never the secret.

## GitHub PAT

The PAT previously pasted into chat is compromised and must be revoked in GitHub immediately. Do not test or reuse it. Prefer the authenticated GitHub CLI/OAuth or a narrowly scoped GitHub App. Review repository, organization and token audit logs, then rotate any downstream credential the token could read.

## Database

Rotate the `haydev_runtime` password independently from the migration owner. Update `DATABASE_URL`, restart with zero/controlled downtime, verify RLS role attributes and live tenant tests, then invalidate old sessions at the pooler. Rotate `DIRECT_URL` only in the protected migration job and ensure it is absent from the web runtime.

## Supabase

Create and verify a modern `sb_secret_` key, update the server store, pass the complete Storage secret suite, then retire the old modern key. A legacy service-role JWT may not remain a normal runtime dependency. Do not disable a project-wide legacy key until all external consumers have been inventoried.

## Scanner, Owner AI and monitoring

Rotate at each provider, update the server-only secret, test health and a safe end-to-end operation, then revoke the old key. For Owner AI, verify model/endpoint policy and approval boundaries; for scanner, verify CLEAN, EICAR and fail-closed paths; for monitoring, send a sanitized synthetic error.

## Session response

If session-token material or the session database is exposed, revoke all active sessions and require reauthentication after containing the database access path. Session tokens are stored hashed, but active browser cookies remain credentials.
