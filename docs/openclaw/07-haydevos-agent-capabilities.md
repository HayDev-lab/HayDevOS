# HayDevOS agent capabilities

## What is connected in source

Owner AI remains the authenticated tenant boundary. A browser voice command is
transcribed by the browser SpeechRecognition API and submitted to the same
`/api/owner-ai` route as typed text. OpenClaw can answer through the signed
broker when `OWNER_AI_BACKEND=openclaw-broker` is configured.

The Owner AI action protocol now includes:

* `openWorkspaceTab` — allowlisted HayDevOS module/section navigation;
* `openWebSearch` — an explicit, bounded search-tab command; it does not claim
  that search results were verified;
* `openStudioMagic` — opens the editor with a validated prompt without paid
  generation;
* `startMagicMontage` — requires approval, then opens Magic and starts the
  provider/local montage plan.

The authenticated MCP endpoint exposes the same product boundary through:

* `haydevos_workspace_open`;
* `haydevos_web_search`;
* `haydevos_studio_magic`.

## Marketing identity and knowledge boundary

The Marketing module presents the assistant as **HayDev Assistent**. OpenClaw
is an internal runtime/provider choice and is not a customer-facing brand.
Owners, admins and managers can define the assistant prompt, allowed topics,
forbidden topics, response rules and reply mode (`draft`, `approval`, or
`auto`). They can upload sales scripts, support scripts, FAQs, brand voice and
other approved references. Each upload is tenant-scoped, hashed with SHA-256
and included in the Marketing prompt only when enabled. When the approved
knowledge does not cover a question, the assistant must say so instead of
inventing an answer.

## OpenCut reference

The editor discussed in the product request is the open-source CapCut
alternative at [OpenCut-app/OpenCut](https://github.com/OpenCut-app/OpenCut).
This checkout keeps the HayDevOS editor boundary and does not claim that the
external OpenCut repository is already embedded or live-connected.

## Meta channel connectors

The Integration Hub now has official OAuth entry points for Facebook Pages,
Instagram Professional accounts and WhatsApp Business Cloud API, plus a
signature-verified Meta webhook endpoint. App credentials, OAuth redirect URI,
webhook verify token and the 32-byte integration encryption key remain
server-only. The deployment still needs a Meta Developer App, approved scopes,
business assets and App Review where required before a live account can be
connected.

## OpenClaw capability policy

The broker keeps browser, research and media capabilities disabled by default.
To opt in on a dedicated HayDevOS OpenClaw host, configure the server-only
allowlist after the corresponding Gateway profile has been provisioned and
smoke-tested:

```text
HAYDEV_OPENCLAW_TOOL_POLICY=browser,web_search,media_generation,studio
```

Allowed values are `browser`, `web_search`, `media_generation` and `studio`.
Shell, filesystem, arbitrary HTTP and direct tenant/domain writes are never
delegated through the broker. Domain changes and credit-consuming generation
remain inside HayDevOS approval/domain services.

## Runtime boundary

This checkout does not contain a live HayDevOS-owned Gateway, browser profile,
media provider credential or verified external MCP client. Therefore source
support and contract tests do not establish that a production OpenClaw agent
can currently browse, search or render media. Enable the policy only after a
separate trusted Gateway/broker host is deployed and the read-only signed
smoke has passed.
