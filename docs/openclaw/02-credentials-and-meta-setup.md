# Credentials and official-provider setup

## Current status

No live provider credential or connection has been inspected, requested or changed. Local source contains only placeholder documentation. Treat all external integrations as `NOT_CONFIGURED_LOCAL` unless a future server-side health check verifies a configured secret without revealing it.

## OpenClaw broker

The implemented adapter uses HayDevOS-owned server-only configuration for a broker URL, service token and HMAC secret. Do not use `NEXT_PUBLIC_`/`VITE_` prefixes. Do not use the existing user-level OpenClaw/Jarvis state. The broker may hold its own Gateway credential in a root-owned, group-readable-only environment file; HayDevOS itself holds only broker-scoped credentials.

The application environment (`/etc/haydevos/haydevos.env`, `root:haydevos`, mode `0640`) needs only:

```text
OWNER_AI_BACKEND=openclaw-broker
HAYDEV_OPENCLAW_BROKER_URL=http://127.0.0.1:19790
HAYDEV_OPENCLAW_BROKER_TOKEN=<broker-specific-secret>
HAYDEV_OPENCLAW_BROKER_HMAC_KEY=<32-or-more-character-shared-secret>
```

Cleartext is accepted only for a loopback broker. A remote/private-network broker URL must be HTTPS. The broker environment (`/etc/haydevos/openclaw-broker.env`, `root:haydev-openclaw`, mode `0640`) repeats the broker token/HMAC key and, separately, holds `HAYDEV_OPENCLAW_GATEWAY_URL` (loopback only), `HAYDEV_OPENCLAW_GATEWAY_TOKEN`, optional agent target and timeout. The Gateway token must not appear in the application environment, release archive, browser or logs.

Provision in this order:

1. Determine whether production is one owned organization or multi-tenant.
2. Create an isolated service account/state directory per permitted trust boundary.
3. Install a supported OpenClaw version using its official non-Docker installation path and record package version/integrity.
4. Disable all unneeded tools/plugins before the first request; run the documented OpenClaw deep security audit.
5. Create a private broker endpoint, firewall it to HayDevOS, configure bidirectional HMAC validation, then install but do not yet enable `haydev-openclaw-broker.service`.
6. Add server-only secrets through the host's secret store, then verify a read-only smoke request and a rejected unsigned request.

## Meta, WhatsApp, Instagram and Facebook

No Meta App, OAuth client, WABA, Page, Instagram Professional account, webhook, callback URL, App Review, token or sandbox account was created by this work.

When the owner explicitly authorizes this phase, use Meta's official developer console to:

1. create or select the business-owned Meta App;
2. register exact HTTPS callback/webhook URLs and rotate state/PKCE secrets server-side;
3. connect only approved Pages, Instagram Professional accounts and WhatsApp Business assets;
4. request only the scopes that the selected feature needs;
5. verify each webhook signature and persist incoming provider IDs for deduplication;
6. keep auto-reply off until account-level policy, 24-hour-window/template requirements, consent and operator handoff are tested in a sandbox.

Personal Facebook Messenger and personal Instagram are not accepted as official business connectors. Personal WhatsApp QR pairing, if ever opted in, remains an isolated read-only/draft-by-default owner feature and must not be labelled WhatsApp Business.
