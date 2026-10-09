# Architecture and trust decisions

## ADR-01 — Owner AI remains the product experience

Owner AI keeps its route, UI, conversation IDs, audit UX and authorization boundary. OpenClaw is an optional backend reasoning runtime selected only through a server-only adapter. It must never replace the Owner AI name or expose a Gateway control UI to HayDevOS users.

## ADR-02 — A broker, never a raw Gateway proxy

The application may contact only a HayDevOS-owned broker endpoint. The broker is a separate native Node/systemd service on a private network or loopback of the HayDevOS VPS. It owns the connection to the private OpenClaw Gateway. It accepts the narrow Owner AI completion protocol defined below; it does not forward arbitrary paths, headers, session IDs, tool definitions or bearer tokens from an application client.

The browser, Vercel functions, public webhooks, customer messages and social clients never receive an OpenClaw Gateway bearer token. A Gateway token is not accepted by the HayDevOS application API.

## ADR-03 — Tenant permissions remain in HayDevOS

Every application request derives this envelope from the authenticated server session; the browser cannot supply or override it:

```text
tenantId, actorUserId, actorRole, conversationId, requestId,
correlationId, locale, actionIntent, riskClass, originTrustLevel
```

The broker uses the envelope only to route an already-authorized reasoning request. It cannot authorize data access or domain writes. All reads and writes continue through the existing tenant-scoped domain services in HayDevOS at execution time. An OpenClaw session key is context routing only, never an authorization credential.

## ADR-04 — Tools are typed and fail closed

The existing Owner AI registry is the initial inventory, not permission to expose every entry to an agent. A production tool must declare: stable name/version, validated input schema, read/write risk, required HayDevOS permission, idempotency rule, audit event, response schema and owning domain service. The model cannot supply tenant ID, role, approval ID, raw SQL, arbitrary URLs or arbitrary tool names.

Read tools must return one of `DATA`, `NO_DATA`, `PERMISSION_DENIED`, `NOT_SUPPORTED`, `PROVIDER_ERROR` or `TIMED_OUT`. Writes require the existing domain command plus approval where applicable; an approval is tenant-scoped, bound to a stable action hash, expires and is consumed once.

## ADR-05 — Trust boundaries are processes, not session labels

The schema supports multiple organizations. Until an operator proves that production is a single owned organization, a shared tool-enabled Gateway is prohibited. For mutually untrusted organizations, each enabled Owner runtime needs distinct Gateway state, credentials and an unprivileged Linux service account (or stronger host/VM isolation). Public Inbox traffic must use a separate restricted worker and can never enter a private Owner agent with broad tools.

Personal WhatsApp, Business WhatsApp and Meta business channels are distinct credentials and policies. No current channel is implemented or enabled by this decision.

## ADR-06 — Native operations, official social APIs

No Docker is required. A permitted VPS deployment will run the broker/Gateway under a dedicated unprivileged account with systemd, locked secret files, loopback/private bind, bounded retries and audit logs. Meta channels, when implemented, use official APIs and verified webhooks/OAuth; personal Facebook or Instagram automation is not a production connector. Postiz is not required.

## Broker protocol v1

The server-side adapter posts only to a fixed broker route. It sends a bounded completion request and a derived envelope, HMAC-signed with a broker-only secret. Each Owner AI model turn has a distinct request ID. The broker authenticates the sender, enforces timestamp/replay limits, independently allowlists the route and replies with a matching signed response. An identical retry receives the cached signed result; a changed request using the same request ID is rejected. The adapter rejects a missing/invalid response signature, mismatched request ID, oversized payload, timeout and non-completed state.

The broker runs OpenClaw without shell, browser, node-pairing, arbitrary filesystem, uncontrolled MCP or public channel tools. It is initially a reasoning-only path; HayDevOS continues to execute authorized domain reads/actions itself. This deliberately avoids giving OpenClaw database credentials or a Supabase service key.

The HayDevOS adapter implementation uses a fixed `/v1/haydev/owner-ai/completions` broker path, service authentication plus request/response HMAC, bounded payloads/timeouts and a replay window. It rejects the documented raw Gateway port and rejects unsigned or mismatched responses. This adapter is selectable only with server-only configuration; it is not live until the broker is independently deployed and verified.

## Decision status

Architecture is approved for source implementation only. Live enablement is blocked until a separate HayDevOS broker/Gateway and the appropriate per-tenant host isolation are provisioned and verified.
