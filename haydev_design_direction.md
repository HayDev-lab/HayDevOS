# HayDev — design direction and implementation plan

## Three directions

| Direction | Product Fit | Uniqueness | UX | Mobile | Performance | Complexity | Decision |
|---|---|---|---|---|---|---|---|
| Orbital Control — graphite, electric lime, industrial orbital core, editorial service rows | High: one business system | High with original art and meaningful module interaction | Clear offer, stationary targets, visible CTA | Compressed art and stacked layouts | No WebGL; native transitions | Moderate | SELECT |
| Deep Space Atlas — navy, cyan, star-field constellation | High: connected processes | Medium; common space motif | Labels can compete with particles | Needs density reduction | Continuous particles cost GPU | Moderate | REJECT: weaker distinction |
| Mission Console — amber, instrument grid, dense telemetry panels | Medium: may resemble product dashboard | Medium | Risk of implying a working SaaS and invented metrics | Dense panels difficult at 320px | CSS cheap; UI complexity high | High | REJECT: wrong product impression |

## 3D decision gate (before adding visual)

| Criterion | Assessment |
|---|---|
| Product Value | Orbital core makes the connection between four disciplines memorable |
| Thematic Fit | Mission control for business growth |
| User Benefit | Selecting a stable module explains its role; main CTA remains independently accessible |
| Technical Cost | True WebGL not necessary; original pre-rendered 3D asset and CSS perspective |
| Bundle Impact | No Three.js/R3F/shader dependency; measure optimized asset and built client assets |
| Mobile Impact | Responsive WebP, no parallax on coarse pointers, stationary controls |
| Accessibility Impact | Image decorative, text in DOM, labeled buttons, visible focus; no information exclusive to motion |
| Fallback | Raster render is baseline; all copy/controls available if image fails; dark background still coherent |
| Reduced Motion Behavior | Stop parallax, smooth scroll and nonessential animation; controls still update instantly |
| Maintenance Risk | Low: no GPU context, shader compatibility or external scene hosting |
| Decision: ADD / ADD_LATER / REJECT | REJECT live WebGL. ADD lightweight interactive pre-rendered 3D alternative |

No live 3D is claimed. Since no heavy runtime is included, lazy-loading that runtime is not applicable. Above-fold hero image is eager for LCP, responsive mobile asset is smaller. Lower-section art, if reused, is lazy. Performance must be reported from actual build/browser evidence, never presumed PASS.

## Product positioning

HayDev turns business processes, marketing and digital presence into one connected growth system. The copy explains manual work, intake, assignment, customer journey and measurement. Outcomes are labeled example scenarios, with no invented client results or percentages.

## Implementation plan

1. Preserve Sites Vinext/React/TypeScript/Tailwind starter and adopted pnpm lock; initial workspace empty and no user changes.
2. Author editable content, semantic landing page, original orbital hero, system switch, service accordion, mission stage controls, outcome tabs, trust and minimal lead form.
3. Persist leads in D1 via validated same-origin POST, prepared statements, idempotency and contact-rate limit. No email or social destination invented.
4. Add metadata/favicon, responsive styles for 320 through wide desktop, focus and reduced-motion behavior.
5. Run existing lint, compiler, build, local browser QA and functional form/storage checks. Repair one confirmed error at a time.
6. Re-read actual source/output for final audit; save/publish private review Site. Record unavailable contact/legal data as public-launch blockers.

## ERP / Business OS update — 2026-09-13

Implementation plan: (1) add ERP to hero, navigation, services, process and metadata in all three languages; (2) build an explorable command-core data map with ten connections, eight module entry points, ten service directions and two packages; (3) update Armenia opportunity strategy with sourced context and explicit hypotheses; (4) verify interactions, translations and responsive layout, repair confirmed issues, then publish to the existing audience.

The earlier WebGL rejection was a design/architecture judgment, **not a failed benchmark**. No WebGL prototype was built or timed (NOT_RUN). A live 3D scene can be reconsidered if spatial manipulation adds a demonstrated product benefit. A heavyweight dependency alone is not evidence that performance would fail. The current choice preserves a pre-rendered hero with pointer perspective; it does not claim live 3D.

### ERP visual gate
| Criterion | Assessment |
|---|---|
| Product Value | Make the data relationship between ERP, acquisition and operations understandable |
| Thematic Fit | ERP is mission control; stable orbit nodes represent real categories of business data |
| User Benefit | Select one of ten connections to read problem, data and operational value |
| Technical Cost | DOM buttons, functional SVG connection diagram, existing React state |
| Bundle Impact | No added dependency or 3D runtime; new localized copy and component only |
| Mobile Impact | Two-column selector replaces spatial orbit below 768px; same information and actions |
| Accessibility Impact | Native keyboard buttons, aria-pressed, aria-controls, live detail panel; decorative geometry hidden |
| Fallback | Labels, default ERP explanation and linked modules in server-rendered HTML; no image/GPU required |
| Reduced Motion Behavior | No continuous motion; hover transitions disabled under reduced motion |
| Maintenance Risk | Low; no WebGL lifecycle or shader compatibility surface |
| Decision: ADD / ADD_LATER / REJECT | ADD functional 2D orbital map. ADD_LATER live WebGL only if validated by a dedicated prototype |

## WebGL and compact landing — supersedes earlier rejection
User explicitly requested real WebGL and a lighter, more interactive landing.

| Criterion | Assessment |
|---|---|
| Product Value | A rotatable core responds to the chosen business discipline; retains clear text explanations |
| Thematic Fit | One operating core with connected orbital components |
| User Benefit | Drag, rotate with keyboard buttons, pause/reset and choose a discipline; content independent of GPU |
| Technical Cost | Small native WebGL 1 renderer; sphere/torus meshes and one lighting program, no textures or post-processing |
| Bundle Impact | Dynamic import; no new dependency; exact gzip size recorded in verification |
| Mobile Impact | Lower mesh resolution, DPR capped at 1, target 20fps; desktop DPR <=1.5 and target 30fps; buffer capped at 900×720 |
| Accessibility Impact | Canvas decorative; accessible DOM controls and descriptions; no hover-only or GPU-only content |
| Fallback | Existing responsive image before first frame, failed context or context loss; user-selectable 2D |
| Reduced Motion Behavior | No automatic rotation; single-frame redraw on explicit controls; pause control hidden when unnecessary |
| Maintenance Risk | Native renderer owns resources, resize/intersection/visibility listeners and disposal |
| Decision: ADD / ADD_LATER / REJECT | ADD WebGL, explicitly requested; preserve fallback and evidence limits |

Plan: implement lazy renderer and controls; replace repetitive page sections with compact module/service/stage selectors and on-demand details; verify graphics, fallback, translations, layouts and CTA; publish existing Site.
