# Publishing compliance gate

HayDevOS must not use media “uniqueizers”, prompt obfuscation, trigger-word
substitution, metadata stripping or browser automation to evade Meta or
WhatsApp enforcement. Those techniques do not make content compliant and can
increase account-integrity risk.

The server-side preflight endpoint is:

```text
POST /api/marketing/publish/preflight
```

It returns `allow`, `review` or `block`. A real publisher must call the gate
before sending media or messages and must stop on `block`. `review` requires a
human approval; it is never silently rewritten by the system.

The gate checks:

- ownership/licence confirmation and consent for recognizable people;
- an official API transport rather than personal-account/browser automation;
- AI disclosure or provenance evidence for generated media;
- WhatsApp recipient opt-in, approved templates outside the 24-hour service
  window, and a human escalation path for automation;
- broad risk signals such as deceptive financial/health claims, impersonation,
  pressure and engagement bait.

The risk signals are categories, not a list of words to work around. Meta does
not provide a universal “safe words” list, and the same phrase can be allowed
or disallowed depending on context, targeting, consent and the account's
history.

## Platform operating rules

1. Use the official Meta Graph/Instagram API and WhatsApp Business Platform
   only. Do not automate a personal Facebook or Instagram account, WhatsApp
   Web, CAPTCHA or rate-limit bypass.
2. Keep a content record: source prompt, input assets, rights/consent evidence,
   C2PA/Content Credentials when available, generated hash, reviewer and
   destination.
3. Keep a publication queue with idempotency, cooldowns, per-account rate
   limits, rejection history, appeal links and a kill switch.
4. For WhatsApp, keep opt-in and opt-out records per recipient and category;
   use approved templates for business-initiated conversations and respond
   inside the customer-service window when no template is used.
5. If content is rejected, preserve the provider reason and use the official
   appeal/support path. Do not repeatedly retry the same payload.

## Candidate open-source components

- [c2pa-js](https://github.com/contentauth/c2pa-js) can read, validate and add
  signed Content Credentials to images and video in Node.js/browser contexts.
- [nsfwjs](https://github.com/infinitered/nsfwjs) can perform local image/video
  safety classification, including a CPU backend. It is a triage signal, not
  proof that a platform will accept or reject an asset.

Neither project is a ban-avoidance tool. They are candidates for a later
provenance/safety worker after the actual publisher and storage pipeline are
implemented.
