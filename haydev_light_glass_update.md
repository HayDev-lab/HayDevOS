# HayDev — lighter layout and glass buttons

## Implemented
Shortened default page to hero/core, compact architecture, optional capabilities, industries, collapsed audit and contact. Removed duplicate hero controls and fragmented-data comparison. ERP, automation, owner panel and delivery process remain available inside a lazy-loaded accordion. Preserved WebGL, Armenian default and Russian/English, audit logic and lead endpoint.

Buttons use transparent gradients, bevel highlights, depth shadows and pointer hover/press feedback. Mobile disables backdrop blur; reduced-motion disables transforms and transitions. Mobile industry routes use a compact numbered two-column composition.

## Verification
- PASS: TypeScript --noEmit, exit 0.
- PASS: scoped ESLint on HayDev components, sections and locale layout, exit 0.
- PASS: production build via Sites build helper, exit 0. Environment proxy and plugin timing warnings only.
- PASS: content verification, 339 translation keys, 3 languages, 10 nodes, 5 layers, 8 industries, 8 audit questions; removed rotation panel remains absent.
- PASS: browser desktop screenshot reviewed; capabilities disclosure opens.
- PASS: mobile iframe 390×844 (375px content viewport with scrollbar), screenshot reviewed; scrollWidth equals clientWidth, audit launcher reveals question 1 and options.
- NOT_RUN: full new end-to-end lead submission, full responsive matrix, FPS and memory profiling. WebGL engine and server endpoint unchanged.

## Repair
Confirmed owner-panel automation link would target unmounted accordion content. Added controlled panel selection so that link opens automation before scrolling. Typecheck/lint/build PASS; direct browser click regression NOT_RUN.

## Verdict
COMPLETE_WITH_KNOWN_LIMITATIONS: focused layout validation passed. Broad earlier reports describe the previous version; no new claim of exhaustive device or performance verification.
