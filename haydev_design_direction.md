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
