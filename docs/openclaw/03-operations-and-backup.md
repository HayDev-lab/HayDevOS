# Operations and backup runbook

## Existing deployment evidence

The repository contains a hardened VPS release kit: Caddy terminates public HTTPS and reverse-proxies to a Next.js server bound to loopback; the application systemd unit uses the `haydevos` account. Backup and readiness units are present. This has not been executed against a VPS in this task.

## Required OpenClaw deployment shape

The repository now includes `scripts/openclaw-broker.mjs`, its fixed-protocol implementation, and `deploy/systemd/haydev-openclaw-broker.service`. The bootstrap script creates the distinct `haydev-openclaw` account and its locked environment file, but deliberately leaves the unit disabled. The release packager includes both broker scripts in each immutable application artifact.

Deploy a HayDevOS broker and a private Gateway as native Node/systemd services, outside the public frontend process. Use a distinct unprivileged account and state directory for every approved trust boundary. The broker is the only process allowed to hold/use the Gateway credential. Bind the Gateway to loopback or a private network. The broker must have no public arbitrary-proxy endpoint.

Before enabling:

1. record OpenClaw and Node versions and package provenance; do not reuse the local Jarvis state;
2. install minimal tool/plugin policy and run the OpenClaw security audit;
3. configure service restart, log retention/redaction, CPU/memory/disk limits and health checks;
4. verify firewall exposure and reject unsigned/untrusted broker requests;
5. back up state and perform a disposable restore test;
6. soft-launch only read-only Owner AI per organization, then approved writes, then any opt-in automation.

## Health and incident control

The broker must expose an authenticated/private health signal to HayDevOS and report `NOT_CONFIGURED`, `DEGRADED`, `UNAVAILABLE` or `VERIFIED` without secrets. It needs bounded retry/circuit-breaker behavior, worker concurrency limits, cancellation and a manual kill switch. On incident: disable the broker integration flag, stop the broker/Gateway service for the affected trust boundary, preserve redacted audit records, rotate scoped credentials and use the existing manual Owner AI fallback only when its permissions remain equivalent.

## Rollback

No live OpenClaw deployment exists to roll back. For future releases, roll back the HayDevOS immutable release symlink to the previously verified release and restart the application service; keep database changes forward-compatible and never improvise a destructive down migration. Broker/Gateway rollback is a separate service version rollback after its state backup and compatibility check. Do not enable the broker unit as part of normal release installation: require an explicit post-install configuration and signed-read-only health verification.
