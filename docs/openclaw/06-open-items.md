# Open items and GATE scorecard

| Gate | Status | Evidence / pending work |
| --- | --- | --- |
| 0 — baseline | PASS | `00-baseline.md`; static/build baseline recorded, unknowns classified |
| 1 — trust/typed contracts | PARTIAL | ADRs plus signed server-only broker adapter and contract tests; full production tool schema/memory contracts still required |
| 2 — Gateway hosting | PARTIAL | loopback-only broker implementation, hardened unit template and release packaging exist; no HayDevOS-owned Gateway, host, secret store configuration or live probe |
| 3 — multi-tenant isolation | BLOCKED_EXTERNAL | schema is multi-tenant; actual production tenant/trust-boundary topology not verified |
| 4 — Owner AI bridge | PARTIAL | Owner AI can select the signed broker adapter while preserving its tenant/domain boundary; broker enforces a fixed Gateway path/agent and no tool calls; no broker/Gateway is deployed or live-verified |
| 5 — domain tools | PARTIAL | existing domain services/approval executor exist; mock registry must never become a production tool surface |
| 6 — durable agent jobs/memory | NOT_STARTED | no safe schema/migration can be applied without a reviewed isolated DB environment |
| 7 — Unified Inbox/connectors | NOT_STARTED | current integration UI is in-memory; no provider APIs/webhook routes exist |
| 8 — public-channel policy | NOT_STARTED | must follow a real Inbox data model and separate restricted worker |
| 9 — Marketing/publishing | BLOCKED_EXTERNAL | no verified HayDev Marketing API/integration in this checkout; no Meta sandbox connection |
| 10 — UI integration | NOT_STARTED | preserve existing Owner AI/orbital UI; do not add misleading connection controls first |
| 11 — automations | PARTIAL | existing automation domain exists; no OpenClaw-driven durable worker or two live internal E2E paths verified |
| 12 — security regression | PARTIAL | existing structure suite plus broker HMAC, raw-port, loopback and tool-call rejection tests; no live Gateway/Meta negative suites |
| 13 — full release suite | BLOCKED_EXTERNAL | isolated DB, provider and browser/production evidence are unavailable |
| 14 — deployment/restore | PARTIAL | repository VPS kit now packages the broker and includes a disabled hardened service unit; no cold restart or restore drill has been run |
| 15 — release acceptance | BLOCKED | depends on all preceding provider, isolation, deployment and test evidence |

## Exhaustive current limitations

* No live OpenClaw feature is claimed. The only discovered CLI/runtime is external to HayDevOS and may be Jarvis-owned.
* No raw Gateway endpoint, Gateway token, external browser/client access or public proxy is permitted.
* No data migration, RLS change, Supabase change, live account creation, OAuth action, Meta App Review step, WhatsApp pairing, post, customer message, financial operation or deployment has been performed.
* The current Integration Hub is not a server-backed credential vault, webhook processor or provider health implementation.
* The current Owner AI mock-data registry remains development-only and must not be represented as provider/domain data.
* Local readiness is not usable without non-production database/scanner configuration and contains the baseline scanner-factory error path described in `00-baseline.md`.

## Next safe step

Provision one isolated non-Jarvis Gateway trust boundary and an approved non-production database, then run the broker's signed read-only smoke and the existing isolated security integration suite before enabling any live Owner AI routing.
