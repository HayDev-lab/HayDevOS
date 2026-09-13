# HayDev — WebGL and compact landing

## Result and scope
Real native WebGL 1 renderer added and dynamically imported when the hero enters view. Four selectable material accents, pointer drag, rotate buttons, pause, reset and 2D fallback. Desktop/mobile mesh resolution differs; framebuffer at most 900×720, DPR 1.5/1, target 30/20fps. These are limits, not measured achieved FPS. No textures, external models, post-processing, new packages or changed lockfile.

Removed the duplicate system and ERP orbit diagrams. ERP now uses module buttons with a single detail area; ten service/industry options use one selector. Five service explanations and five process stages use selectors. Package includes, outcomes and trust are available on demand. Armenian default, Russian, English and existing inquiry storage remain.

## Verification evidence
| Check | Status | Evidence |
|---|---|---|
| Git baseline | PASS | Clean existing checkout; owner-private Site reused |
| TypeScript | PASS | `node node_modules/typescript/bin/tsc --noEmit`, exit 0 |
| Lint | PASS | `node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next`, exit 0 |
| Production build | PASS | Sites build-site.mjs, exit 0 |
| Lazy engine size | PASS | Built orbital-engine chunk: 5,989 bytes, gzip 2,636 bytes |
| Actual shader/mesh rendering | PASS | Actual engine matrices, vertex/index buffers, colors and shader strings captured; replayed in Mesa OpenGL ES. Shader compile/link PASS; GL error 0; 10 draw calls; 26,400 desktop triangles; 2,276 distinct rendered pixel colors. Render image visually inspected |
| Browser WebGL | BLOCKED | Preview browser getContext('webgl') returned null: `WebGL unavailable`. No successful browser GPU rendering or FPS claim |
| Fallback | PASS | Browser showed existing image, disabled unavailable rotation controls, readable content and functional CTA |
| Responsive | PASS | HY/RU/EN × 320,360,375,390,414,768,1024,1200,1440,1920: 30/30 clientWidth equals scrollWidth |
| Interactive selectors | PASS | Browser QA harness: 40 checks per language, 120 total; eight ERP modules, ten integrations, five services, five stages, ten industry selections, two package detail disclosures. Selected-state checks passed; industry descriptions returned; package details opened |
| Conversion CTA | PASS | Actual English Business OS CTA click reached /en#contact and visible form |
| Toolbar separation | PASS | Actual DOM rectangles show no overlap with scene caption after repair |
| Full submit regression | NOT_RUN | API/form unchanged, no new inquiry created |
| Browser reduced motion, context-loss and lifecycle GPU checks | NOT_RUN | Source reviewed; WebGL unavailable in QA browser |
| Physical mobile / Lighthouse / field CWV | NOT_RUN | No field-performance claims |

Native OpenGL ES diagnostic is deliberately distinguished from browser WebGL. It validates compiled shaders and a rendered frame using the real renderer's draw data; a lightweight stub captures submissions only and does not count as rendering. Native Mesa performs the actual render. Reproducible commands: `node scripts/verify-webgl-capture.mjs`, `python scripts/verify-webgl-render.py`. No alternate browser or browser flags were used.

## REPAIR CYCLE — GL-01
### 1. Confirmed Error
WebGL context cannot be created in the QA browser.
### 2. Evidence
Canvas data-failure: WebGL unavailable; no frame counter; fallback rendered.
### 3. Root Cause
Browser context availability, before shader compilation. No evidence of a shader error.
### 4. Minimal Fix
Keep graceful fallback; expose diagnostic reason; independently validate actual graphics code with native GLES.
### 5. Files Changed
components/visuals/orbital-scene.tsx; optional diagnostic scripts.
### 6. Verification
Fallback works in browser; native shader/link/draw all pass.
### 7. Micro Audit
No GPU access policy weakened; no browser-success claim fabricated. Core site works without graphics.
### 8. Decision
BLOCKED_MANUAL_ACTION for real browser GPU acceptance on a WebGL-capable device. Implementation continues with verified fallback.

## REPAIR CYCLE — GL-02
### 1. Confirmed Error
Desktop toolbar overlapped the scene description in first fallback screenshot.
### 2. Evidence
Toolbar bottom offset 104px encroached on caption whose bottom offset is 66px and minimum height 54px.
### 3. Root Cause
New control strip shared the existing caption's vertical range.
### 4. Minimal Fix
Move desktop toolbar to bottom 138px; preserve mobile 85px and move the adjacent marketing chip upward.
### 5. Files Changed
app/globals.css.
### 6. Verification
DOM bounding rectangles after adjustment show no overlap; 30 responsive widths remain in bounds.
### 7. Micro Audit
No content hidden to pass the check. Fallback and 3D use the same toolbar positioning.
### 8. Decision
ERROR_CLOSED.

# FINAL DEEP AUDIT — HayDev Website
## 1. Sources Checked
Actual renderer, React scene lifecycle, HayDev component, ERP component, dictionaries, CSS, package scripts, build output, git diff and browser/native diagnostic results.
## 2. Product Positioning
Business OS, ERP, AI, website, CRM and advertising remain connected; copy remains concrete.
## 3. Content Quality
Long explanations disclosed through interaction; original package and industry content retained. No fabricated outcomes.
## 4. Visual Originality
Live geometric core with a material accent per discipline; retained graphite/lime identity and original image fallback.
## 5. 3D Decision Compliance
User-requested ADD now supersedes earlier rejection. Lazy import, reduced detail, static fallback, visibility/motion limits and disposal implemented. Browser GPU acceptance remains blocked, clearly reported.
## 6. UX / Conversion Flow
Shorter initial flow and fewer repeated sections. Module/service/stage selection and details provide progressive exploration. Existing package CTA reached form.
## 7. Mobile Responsiveness
30 combinations tested, no horizontal overflow. Touch scrolling preserved via pan-y canvas. Native physical device testing NOT_RUN.
## 8. Accessibility
DOM controls independent of decorative canvas, focus states, pressed state, labeled selects, native details, reduced motion. No essential content requires 3D.
## 9. Performance
2,636-byte gzip lazy graphics module, no new dependencies. Capped framebuffer/frame targets and suspension controls. No achieved FPS or LCP/INP assertion.
## 10. SEO / Metadata
Existing localized ERP metadata and canonical/hreflang remain; private noindex retained.
## 11. Code Quality
Small isolated renderer and lifecycle wrapper; existing UI primitives; typed content and state. Build/compiler/lint passed.
## 12. Security / Secrets
No new external connections, credentials, scripts or data collection. QA harness removed before packaging. Diagnostics use local software graphics only.
## 13. Verification Results
See table; browser fallback verified; actual native rendering verified; browser WebGL execution blocked by context availability.
## 14. Remaining Findings
Real-device WebGL rotation/pause/context-loss/performance acceptance required. Original contact/legal placeholders remain before public launch. No production-readiness claim.
## 15. Final Verdict
READY_FOR_CLIENT_REVIEW with explicit browser-GPU acceptance limitation. Published implementation can be reviewed on a WebGL-capable device.
