# Task 2 — Core Shell (agent record)

**Agent:** full-stack-developer (Core Shell)
**Task ID:** 2
**Status:** ✅ Complete
**Verified:** `bun run lint` clean · `bun run dev` running · `GET /` returns 200 with LoginScreen SSR'd

## What landed

### Application shell (`src/components/shell/` — 12 new files)

| File | Purpose |
|---|---|
| `HayDevShell.tsx` | Root client component. Auth gate via `useSyncExternalStore` + module-scope store + `queueMicrotask` hydration flip. Renders `<LoginScreen>` or `<ShellLayout>`. Persists authed flag in localStorage (`haydev-os-authed`). |
| `LoginScreen.tsx` | Premium dark two-panel login. Left: branded panel (HayDevOS wordmark, gradient-brand headline, cycling tri-lingual tagline via AnimatePresence, feature pills, animated gradient mesh + bg-grid + two framer-motion blur blobs). Right: graphite glass-strong card with email/password (prefilled owner@haydev.os / demo), org Select, language DropdownMenu, lime-accent sign-in button with spinner state. 650ms simulated submit → toast + onSignIn. |
| `ShellLayout.tsx` | Authenticated layout. `<div min-h-screen flex flex-col bg-background>` → TopBar → flex row(Sidebar + main + OwnerAiPanel overlay) → sticky footer (mt-auto, h-8, copyright + active org + version + "All systems operational" status dot). Global Cmd/Ctrl+K + Cmd/Ctrl+J listeners. Mobile sidebar via shadcn Sheet (sr-only SheetTitle for a11y). |
| `TopBar.tsx` | Sticky 56px glass bar. Left: hamburger (mobile) + collapse toggle + HayDevOS brand (click → dashboard) + breadcrumb. Center: search trigger button (styled as input) with ⌘K kbd hint. Right: Owner AI quick-toggle, language dropdown, theme toggle (Sun/Moon dark-mode animation), help, separator, NotificationsPopover, UserMenu. |
| `Sidebar.tsx` | Collapsible rail (240px ↔ 64px via framer-motion width animation). Modules grouped by category (Core/Operations/Intelligence/Integrations), Settings pinned at bottom, user/org mini-card at bottom (expanded only). Active item: lime left-border + bg-primary/10 + lime icon. Collapsed: icon-only with Tooltip. Floating collapse-toggle button. Exports `MobileSidebarContent` for the mobile Sheet. |
| `CommandPalette.tsx` | `CommandDialog` bound to `commandOpen` store. Sections: Navigate (11 modules), Quick Actions (5 toasts), Search (filters mock leads/quotes/documents/customers). Local `query` reset on open via `onOpenChange` event handler (no setState-in-effect). Cmd/Ctrl+K listener also self-registers. |
| `NotificationsPopover.tsx` | Bell + unread badge. Glass popover. Per-type icons (Info/CheckCircle2/AlertTriangle/AlertOctagon/AtSign/Clock/Server). Mark-all-read action. Click-to-drill-to-module. Empty state. |
| `UserMenu.tsx` | Avatar+name trigger. Glass dropdown: user header, org switcher (check on active + toast), language submenu, theme submenu (dark/light/system via next-themes), Profile/Audit log/Settings items, destructive Sign out (toast + onLogout). Embeds `<AuditLogDialog>`. |
| `AuditLogDialog.tsx` | Dialog with sticky-header table. Action filter Select (distinct actions). Per-row status-colored action badges via `statusColor`/`toneClasses`. Scrollable. |
| `SettingsPanel.tsx` | Dialog with 4 Tabs. General (org name, locale, currency). Appearance (theme buttons + 5-swatch accent picker). Members (4 mock members table with role badges). Modules (11 modules with Switch toggles, local state). Save → toast. |
| `OwnerAiPanel.tsx` | Slide-in right panel (framer-motion spring). 400px desktop / full-screen mobile with backdrop overlay. Header: Sparkles + "Coming soon" badge + close. Body: locked example prompts + disabled Input ("AI assistant loads in Task 10…"). Footer: ⌘J hint. Placeholder for Task 10. |
| `DashboardView.tsx` | Executive landing page. Welcome header (i18n name+org+date). 9 KPI cards from `mockKpis` with recharts AreaChart sparklines + delta badges. "Needs attention" feed (5 items derived from mock leads/automations/documents/integrations/quotes with CRITICAL/HIGH/MEDIUM/INFO badges + drilldown buttons). 4-button quick actions row. Module status grid (10 modules with health dots derived from mock data + Open buttons). |

### Modified foundation files

| File | Change |
|---|---|
| `src/lib/i18n.ts` | Added ~120 new keys across hy/ru/en: shell.login.*, shell.search.*, shell.command.*, shell.notifications.*, shell.user.*, shell.audit.*, shell.settings.*, shell.ownerAi.*, shell.sidebar.*, shell.topbar.*, shell.footer.*, shell.toast.*, dashboard.* |
| `src/lib/modules/registry.ts` | Imported `DashboardView` and replaced `placeholderFor("dashboard")` with it. The other 10 modules remain placeholders for Tasks 3–11. |
| `src/app/page.tsx` | Replaced minimal branded placeholder with `'use client'` entry that renders `<HayDevShell />`. |

## Key design decisions

1. **Auth gate via `useSyncExternalStore`** — not useState+useEffect. The authed flag lives in module scope and is read from localStorage at client module-eval time. A `queueMicrotask` flips a `hydrated` flag after the first client render so `getSnapshot` returns `false` on both SSR and the client's first paint → no hydration mismatch, no `react-hooks/set-state-in-effect` lint violation.
2. **Local command palette state** — the search `query` lives in CommandPalette, reset to "" on open via the `onOpenChange` event handler. The store's `searchQuery` field stays available for future modules but isn't driven by the palette.
3. **Dashboard "needs attention" feed is derived from mock data** (SLA-breached leads, failed automations, pending documents, reauth-required integrations, sent quotes, new inbound leads) — no new mock file needed.
4. **Module health dots** on the dashboard surface are derived from the same mock data so they stay consistent with the underlying modules.
5. **OwnerAiPanel** is intentionally a locked placeholder (disabled input + "Coming soon" badge + example prompts behind a Lock icon) — Task 10 will replace the body with the real assistant; keep the slide-in animation and `ownerAiOpen` store toggle.
6. **Mobile UX**: sidebar collapses to a Sheet behind a hamburger; TopBar's center search becomes a compact icon button; OwnerAiPanel goes full-screen with a backdrop overlay. All breakpoints via Tailwind `sm:`/`md:`/`lg:`.
7. **i18n everywhere**: every visible string flows through `t(key, locale)` from `useLocale()`. Switching language in TopBar / UserMenu / LoginScreen / SettingsPanel updates the entire shell instantly.
8. **Premium dark enterprise aesthetic**: graphite surfaces (`bg-background`/`bg-card`/`bg-sidebar`), restrained glass (`glass`/`glass-strong` utilities from Task 1's globals.css), lime primary accent (`.text-lime`/`.bg-primary`/`.glow-lime`), cyan secondary accent, NO indigo/blue. Framer-motion transitions on sidebar collapse, OwnerAi slide, and module switch fade.

## Verification

- ✅ `bun run lint` — 0 errors, 0 warnings
- ✅ `bun run dev` — already running on :3000; recompiles cleanly on every save (no errors in dev.log)
- ✅ `GET /` — returns 200; SSR HTML contains LoginScreen content (HayDevOS wordmark, Armenian "Մուտք գործել HayDevOS" sign-in button, "Հավակնոտ թիմերի" tagline) — confirming i18n + LoginScreen render server-side

## Hand-off notes for downstream agents (Tasks 3–11)

- **Replace a module placeholder**: import your view into `src/lib/modules/registry.ts` and replace `placeholderFor("<id>")` with your component for the matching module id. Leave the rest of the manifest metadata intact. The `dashboard` slot is already taken by `DashboardView`.
- **Active module rendering**: `ShellLayout` does `getModule(activeModule).component` with a framer-motion `AnimatePresence` fade keyed on `activeModule` — your view automatically gets the entrance/exit animation. Just render your content in a root `<div>` (consider `mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8` to match the dashboard's container).
- **Toasts**: `import { toast } from "sonner"` → `toast.success(message)`, `toast.error(message)`, `toast.info(message)`.
- **i18n**: `const { t, locale, setLocale } = useLocale();` then `t("your.key")`. Add new keys to all three locale blocks (hy/ru/en) in `src/lib/i18n.ts`.
- **Org-scoped data**: read `activeOrgId` from `useAppStore`. Mock data is currently all `orgId: "org_haydev"`; the second org `org_demo` is registered but has no mock data yet.
- **Status styling**: `statusColor(status)` → `toneClasses(tone)` returns `{ text, bg, border, dot }` class tuples for consistent badges across all modules.
- **The SettingsPanel** already exposes per-module enable/disable switches (local state only) — if you want persistence, wire it to your module's registry or to the app store.
- **The OwnerAiPanel placeholder** is togglable via `ownerAiOpen` (Cmd/Ctrl+J). Task 10 should replace the panel body with the real assistant; keep the slide-in animation and the store toggle.
- **Quick actions** in the command palette and dashboard currently just show toasts. When your module lands, you can wire them to open a create-dialog in your module (e.g., switch active module + open a sheet).

## Files created/modified

| File | Action |
|---|---|
| `src/components/shell/HayDevShell.tsx` | new |
| `src/components/shell/LoginScreen.tsx` | new |
| `src/components/shell/ShellLayout.tsx` | new |
| `src/components/shell/TopBar.tsx` | new |
| `src/components/shell/Sidebar.tsx` | new |
| `src/components/shell/CommandPalette.tsx` | new |
| `src/components/shell/NotificationsPopover.tsx` | new |
| `src/components/shell/UserMenu.tsx` | new |
| `src/components/shell/AuditLogDialog.tsx` | new |
| `src/components/shell/SettingsPanel.tsx` | new |
| `src/components/shell/OwnerAiPanel.tsx` | new |
| `src/components/shell/DashboardView.tsx` | new |
| `src/lib/i18n.ts` | extended (+~120 keys × 3 locales) |
| `src/lib/modules/registry.ts` | wired `DashboardView` into dashboard slot |
| `src/app/page.tsx` | replaced with `<HayDevShell />` entry |
