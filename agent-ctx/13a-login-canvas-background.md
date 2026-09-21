# Task 13a — Login canvas background (animated constellation)

**Agent:** full-stack-developer (Login canvas background)
**Task:** Animated constellation canvas behind the LoginScreen left branded panel — DPR-clamped, reduced-motion safe, low-power.
**Date:** 2026 build pass

## Context

HayDevOS is a complete enterprise platform (Tasks 1–12 done, app stable — see worklog). This task adds a tasteful animated HTML5 `<canvas>` constellation network behind the existing login left panel, on top of the static gradient-mesh fallback. The form content stays at `z-20`, canvas at `z-0`.

## Files

- **Created/edited:** `src/components/shell/LoginBackground.tsx` (pre-existed from a prior scaffold; this pass brought the numeric constants into exact spec alignment + refreshed the docstring).
- **Edited:** none other — `src/components/shell/LoginScreen.tsx` already imports `LoginBackground` (line 48) and renders it inside the left branded panel (line 94) behind the gradient/grid overlays (z-10) and content (z-20).

## Implementation summary

`LoginBackground.tsx` is a `'use client'` component rendering an absolutely-positioned `<canvas class="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden>`.

- **Nodes:** ~50 (`NODE_COUNT = 50`, density-capped on small screens), each a small dot, radius `rand(1.5, 2.5)` px, random accent from `{#a3e635 lime, #22d3ee cyan, #8b95a5 zinc}` at opacity `rand(0.4, 0.7)`. Lime/cyan nodes get a faint outer glow (alpha × 0.18, radius × 2.4).
- **Drift:** gentle velocity `rand(-0.12, 0.12)` px/frame on each axis; wraps around edges (off-by-4 → other side).
- **Lines:** drawn between every pair of nodes within `LINK_DIST = 140` px (CSS px), `lineWidth = 0.6`, stroke `rgba(139, 149, 165, alpha)` where alpha linearly interpolates `0.15` (at d=0) → `0.08` (at d=LINK_DIST). So lines are brighter when nodes are close, fading as they drift apart — always within the 0.08–0.15 band.
- **DPR:** `const dpr = Math.min(window.devicePixelRatio || 1, 2)` — canvas backing store is `width × dpr` × `height × dpr`, transform applied via `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`, CSS size kept at logical px. Crisp on retina, capped so it doesn't melt low-end GPUs.
- **Frame loop:** `requestAnimationFrame(loop)` with a timestamp throttle — `if (ts - lastFrame >= FRAME_MS)` where `FRAME_MS = 1000 / 30` (≈33.3 ms). Effectively caps redraw at ~30 fps even on 144 Hz displays.
- **Reduced motion:** `prefersReducedMotion` read once from `window.matchMedia('(prefers-reduced-motion: reduce)').matches` at effect init. If true: `setupCanvas()` + ONE `drawFrame()` runs (static constellation visible), but the rAF loop and `visibilitychange` listener are NOT registered. So under reduced-motion the user sees a single fixed set of nodes + lines — no animation, no listeners, no churn.
- **Low-power / hidden tab:** `visibilitychange` handler — when `document.hidden`, sets `running = false` and `cancelAnimationFrame(rafId)`. On return to visible (and not reduced-motion), restarts the loop with a fresh `lastFrame = 0` so it doesn't dump a huge catch-up delta.
- **Resize:** `ResizeObserver` on the parent re-runs `setupCanvas()` + `drawFrame()` so the constellation re-flows if the panel resizes (e.g. viewport change between `lg` and `xl`).
- **Cleanup:** unmount returns a function that sets `running = false`, calls `cancelAnimationFrame` (null-guarded), `removeEventListener('visibilitychange', …)`, and `resizeObserver.disconnect()`.
- **Failure mode:** if `canvas.getContext('2d')` returns null, the effect returns early — the component renders an empty `<canvas>` shell and the existing CSS gradient-mesh + grid in `LoginScreen` remains as the visible static background.

## Wiring into LoginScreen.tsx

The left branded panel (line 92) already contained:
- `LoginBackground` (z-0, canvas) — line 94
- `bg-grid` overlay (z-10) — line 96
- radial gradient mesh (z-10) — lines 97–103
- two `motion.div` blurred blobs (z-10) — lines 104–115
- brand block (z-20) — line 118
- centerpiece tagline (z-20) — line 133
- footer (z-20) — line 183

So the canvas sits behind the soft gradient/grid overlays and well behind all form content. The overlays are `pointer-events-none` and use `color-mix(… transparent)` so the constellation remains visible through them — softened, which matches the "subtle, don't distract" mandate. No edits to `LoginScreen.tsx` were needed for this task; the wiring was already in place from the prior scaffold.

## Verification

### 1. Lint
```
bunx eslint src/components/shell/LoginBackground.tsx src/components/shell/LoginScreen.tsx
→ 0 errors, 0 warnings (no output = clean)
```

### 2. TypeScript
```
bunx tsc --noEmit | rg 'LoginBackground|LoginScreen'
→ no matches (0 errors in either file; only pre-existing out-of-scope errors in examples/ + skills/)
```

### 3. agent-browser (runtime)

Dev server: Next.js 16.1.3 Turbopack on port 3000, `GET / 200`.

- `agent-browser open http://localhost:3000/` → ✓ HayDevOS login renders (title: "HayDevOS — The operating system for ambitious teams").
- `snapshot -i` → login form fully interactive: heading "The operating system for ambitious teams." (h1, ref=e2), heading "Մուտք գործել HayDevOS" (h2, ref=e3 — HY default locale), email textbox prefilled "owner@haydev.os" (ref=e8), password textbox (ref=e9), org combobox "HH HayDev HQ" (ref=e4), language button (ref=e5), "Մուտք գործել HayDevOS" submit (ref=e6).
- `eval` canvas presence:
  ```json
  {"found":true,"width":704,"height":613.5,"clientWidth":704,"clientHeight":614,
   "attrW":"704","attrH":"613","hasContext":true,
   "className":"pointer-events-none absolute inset-0 z-0 h-full w-full",
   "ariaHidden":"true",
   "parentClass":"relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-b…"}
  ```
  → canvas exists, non-zero size (704×613.5 px), 2D context present, classes match spec (`pointer-events-none absolute inset-0 z-0`), `aria-hidden="true"`, parent is the left branded panel.
- `eval` pixel sampling (coarse grid, step 14): 23 / 2244 sampled pixels non-zero (1.02%) — consistent with a sparse constellation of ~50 small dots + thin 0.6 px lines. Sample non-zero pixel: `r=139 g=139 b=162 a=11` — an anti-aliased edge pixel of a zinc line (drawn colour `rgba(139,149,165,α)` with α in 0.08–0.15). Canvas is genuinely painting, not blank.
- `eval` stacking check: `getComputedStyle(canvas).zIndex === "0"`, `position === "absolute"`, `pointerEvents === "none"`; the brand block `.relative.z-20` has `zIndex === "20"`, `position === "relative"`. → form content sits above the canvas as required.
- `eval` animation-running check (two samples ~2 s apart, hash = `Σ(d0·7 + d1·13 + d2·17 + d3·31)` over non-zero pixels):
  - sample A: `{nz: 24, sig: 143659}`
  - sample B: `{nz: 22, sig: 144538}`
  - `sigChanged: true, animationRunning: true` → the rAF loop is actively redrawing the constellation (nodes drift, lines reform).
- `console` → only benign entries: React DevTools promo, `[HMR] connected`, `[Fast Refresh] rebuilding`, `[Fast Refresh] done in Nms`. No errors, no warnings.
- `errors` → empty (no page errors).

### 4. Reduced-motion — code review

agent-browser does not expose a reliable `prefers-reduced-motion` media emulation that survives `reload` (the `set media reducedmotion` subcommand reported "Done" but `window.matchMedia('(prefers-reduced-motion: reduce)').matches` returned `false` after reload; matchMedia mocks installed via `eval` cannot survive a navigation/reload because the page context resets). Runtime simulation therefore not feasible with this toolchain — falling back to code review per the task spec ("at minimum confirm the component handles it (code review)").

Code review of `LoginBackground.tsx` reduced-motion path:
1. **Read once at effect init** (lines 64–66):
   ```ts
   const prefersReducedMotion =
     typeof window !== "undefined" &&
     window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
   ```
2. **Static frame always painted** (lines 186–187):
   ```ts
   setupCanvas();
   drawFrame(); // always paint at least one frame so the static version is visible too
   ```
   → under reduced motion, a full constellation (nodes + lines + glow) is rendered once.
3. **Loop + listener gated** (lines 189–192):
   ```ts
   if (!prefersReducedMotion) {
     rafId = window.requestAnimationFrame(loop);
     document.addEventListener("visibilitychange", handleVisibility);
   }
   ```
   → under reduced motion, NO rAF loop is started and NO visibilitychange listener is added. The component does zero per-frame work after the initial paint.
4. **`handleVisibility` re-entry guard** (line 179): `else if (!prefersReducedMotion)` — even if some other code path tried to restart on visibility change, it's blocked under reduced motion.
5. **Cleanup is safe in both modes** (lines 200–205): `cancelAnimationFrame` is null-guarded (`if (rafId !== null)`), `removeEventListener` is idempotent, `resizeObserver?.disconnect()` is optional-chained. The `ResizeObserver` is still registered under reduced motion (so the static frame re-flows on viewport resize without animation) — desirable.

→ Confirms the spec: "render ONE static frame (no loop), a fixed set of nodes + lines."

## Notes / hand-off

- The component was already wired into `LoginScreen.tsx` (line 48 import, line 94 render) from a prior scaffold — confirmed correct, no edit needed.
- The dev server had died (no process on port 3000) when this task started; it was restarted once with `nohup setsid bun run dev` (PID 2444 at end of session) and left running so subsequent tasks inherit a live server. Server is healthy: `GET / 200`.
- No other files touched. Login form, gradient mesh, grid, blobs, brand, tagline, footer all untouched.
- Palette respects the house rule: lime `#a3e635`, cyan `#22d3ee`, zinc `#8b95a5` only — NO indigo, NO blue.
