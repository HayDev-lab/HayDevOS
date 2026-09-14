# HayDev — Business Operating Systems

Existing Armenian-first HayDev site, with Russian and English routes. The site demonstrates how marketing, a website, leads, CRM, sales, ERP, operations, finance, analytics and AI can work on shared data. This is a services website with interactive examples, not an operational customer ERP.

## Stack and routes
Sites Vinext / React 19 / TypeScript / Tailwind 4, existing Radix primitives, Cloudflare Worker and D1. pnpm lockfile and dependencies are preserved. No graphics or animation dependency added.

- `/` redirects to `/hy`; `/hy`, `/ru`, `/en` have their own language metadata and canonical URLs.
- `/:locale/audit` is the full HayDev Business Audit product in Armenian, Russian and English.
- `/api/leads` validates and persists enquiries. No public read endpoint.
- Current audience is owner-private. `noindex` and current access policy are intentionally preserved.

## Editable source
- `components/haydev.tsx`: page sequence, navigation, project stages, trust, contact and legal dialog.
- `components/sections/business-core.tsx`: hero, ten semantic system nodes, shared selection and explanation.
- `components/visuals/orbital-engine.ts`: native WebGL mesh renderer, adaptive quality and resource ownership.
- `components/visuals/orbital-scene.tsx`: lazy initialization, first-frame and failure fallback.
- `components/sections/growth-system.tsx`: fragmented/connected comparison, five layers, eight automation recipes and six intelligence modules.
- `components/sections/erp-section.tsx`: shared-data pipeline, existing eight ERP modules, ten directions and two packages.
- `components/sections/industry-systems.tsx`: eight selectable industry architectures.
- `components/sections/mission-control.tsx`: clearly labelled demonstration dashboard. All numbers are synthetic examples, not customer outcomes.
- `components/sections/business-audit.tsx`: eight questions, rule-based preliminary map and transfer to the enquiry form.
- `components/business-audit/audit-app.tsx`: the full 15-question internal/public audit workspace and report.
- `data/business-audit.ts`: localized questions, answer weights, Automation Map states and recommendation catalogue.
- `lib/audit-engine.ts`: versioned draft parsing, six-domain scoring and a stable future-integration payload.
- `components/sections/contact-form.tsx`: editable enquiry, consent, server response and error states.
- `data/business-os.ts`, `data/erp-content.json`, `data/site-content.ts`: structured content.
- `data/translations.json`: all three dictionaries. New visitor-facing text has Armenian and English translations.
- `app/globals.css`: existing brand and shared UI; `app/business-os.css`: scoped Business OS extensions.

## Audit and enquiry data
Both diagnostics are deterministic, not LLM calls. They do not inspect a visitor's systems, predict savings or claim verified efficiency. The compact homepage diagnostic stays in React memory. The full Business Audit stores a versioned draft in the current browser so answers survive refresh and backward navigation; it does not send those answers to HayDev or a third party. Its report can produce a stable `haydev.business-audit/1` payload for future CRM, LeadOS and HayDev Control connections, but no external connector is active yet.

`POST /api/leads` uses existing schema, prepared SQL, same-origin enforcement, body limits, UUID idempotency and per-contact rate limiting. Success appears only after the server accepts the request. D1 data can be inspected through the Site owner's data management. Email/Telegram notifications and external CRM are not connected.

## WebGL
One native WebGL 1 program, procedural meshes, no textures or post-processing. Ten ports share a geometry buffer; a packet follows the business sequence. Pointer tilt and drag affect the core. Selected HTML nodes update the renderer and explanation. No rotation-hint toolbar exists.

Dynamic import starts in the viewport. Desktop DPR <=1.25, mobile/constrained DPR <=1, buffer <=900×720. Quality drops to .65 after sustained slow frames. Target frame cadence is 30fps desktop / 20fps mobile, not a measured performance guarantee. Offscreen/hidden rendering stops; reduced motion disables automatic animation; listeners, observers, buffers and program are disposed. The fallback WebP is an exported native frame, 34,594 bytes.

## Development and validation
Existing scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm db:generate`. Sites manages preview/build/publishing. Do not run a second project initializer.

Additional explicit checks:
- `node node_modules/typescript/bin/tsc --noEmit`
- `node scripts/verify-business-content.mjs`
- `node scripts/verify-webgl-lifecycle.mjs`
- `node scripts/verify-webgl-capture.mjs`
- `python scripts/verify-webgl-render.py`

The last two require system EGL/Mesa and Python Pillow. They capture and render the actual shaders/meshes with OpenGL ES; they are not browser GPU benchmarks. Diagnostic artifacts are ignored under `.sites-runtime/webgl-qa/`. Lifecycle tests use a fake GL driver and verify scheduling and cleanup only.

## Release boundary
See `haydev_business_os_verification.md` for current inspection, repair passes, evidence and limitations. Historical research/design/verification reports remain in the repository, with current decisions appended where needed.

The cloud QA browser cannot create a WebGL context. Browser fallback and interactions are verified; native shader rendering succeeds. Hardware-browser FPS/INP/LCP and long-session GPU memory measurements remain unverified. Before public lead collection, the owner must provide final business/operator details and a retention/privacy policy. The page clearly identifies its private-demo status in the data notice; no contact identity is invented.

### Lighter presentation
The default page now keeps detailed capabilities behind a lazy disclosure and starts the audit on demand. Glass button styles live in `app/light-glass.css`; mobile omits backdrop blur and reduced-motion omits transform feedback. See `haydev_light_glass_update.md` for focused verification.
