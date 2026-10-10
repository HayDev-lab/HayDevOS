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
