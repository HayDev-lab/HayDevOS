# Task 1 — Core Foundation (agent record)

**Agent:** full-stack-developer (Core Foundation)
**Task ID:** 1
**Status:** ✅ Complete
**Verified:** `bun run db:push` succeeds · `bun run lint` clean · `GET /` returns 200

## What landed

### Database
- `prisma/schema.prisma` — 23 models, multi-tenant (org-scoped), SQLite-safe (no enums, no `String[]`; lists as JSON strings; roles/status as String). Relations, cascade deletes, and indexes in place. `bun run db:push` succeeded; Prisma Client v6.19.2 generated.

### Design system
- `src/app/globals.css` — Tailwind v4 dark-first enterprise theme. Graphite surfaces (#0a0c10 / #111419 / #151921 / #1a1f27), lime (#a3e635) + cyan (#22d3ee) accents, amber/rose/violet module accents, success/warning/info/destructive semantic tokens, full light-mode tokens. Utilities: `glass`, `glass-strong`, `surface-elevated`, `glow-lime`, `glow-cyan`, `text-lime`/`bg-cyan`/…, `text-gradient-brand`, `bg-grid`, `bg-radial-glow`. Custom thin graphite scrollbars, reduced-motion support, Inter font wiring.

### i18n
- `src/lib/i18n.ts` — locales `hy` (default) / `ru` / `en`, 100+ flat keys (common actions, nav, module titles+descriptions, app shell, categories, KPI labels, lead stages). `t(key, locale, params?)` with `{param}` interpolation. `useLocale()` Zustand hook returning `{ locale, setLocale, t }`.

### Module registry
- `src/lib/modules/registry.ts` — `ModuleManifest` contract (id, nameKey, icon, category, route, description, accent, component, requiredPermissions?). 11 entries registered (dashboard + leados, quoteflow, docsmart, autopilot, erphub, connect, control, ownerAi, audit, settings), each bound to a placeholder. Helpers: `getModule`, `listModules`, `listModulesByCategory`, `accentVar`.
- `src/lib/modules/placeholder.tsx` — JSX placeholder (kept separate so `registry.ts` stays JSX-free).

### App store
- `src/lib/store/app-store.ts` — persisted Zustand store: `activeOrgId`, `activeModule`, `locale`, `sidebarCollapsed`, `commandOpen`, `ownerAiOpen`, `searchQuery`, `user`. Mock orgs (HayDev HQ, Demo Corp) and mock user (Aram Hayrapetyan / owner@haydev.os / OWNER).

### Mock data (`src/lib/mock/`)
- `types.ts` — shared interfaces.
- `leads.ts` (12 leads + 8 activities), `quotes.ts` (8 quotes + items), `products.ts` (12), `documents.ts` (12), `automations.ts` (10), `customers.ts` (10 customers + 7 orders), `invoices.ts` (10 invoices + 5 payments), `integrations.ts` (8), `notifications.ts` (10), `auditLogs.ts` (12), `kpis.ts` (9 KPIs + groups).
- `index.ts` — barrel export.
- `src/lib/seed.ts` — optional DB hydration runner (v1 UI uses in-memory mocks directly).

### Utilities
- `src/lib/utils.ts` — kept `cn`; added `formatCurrency`, `formatDate`, `formatDateTime`, `relativeTime`, `statusColor`, `toneClasses`, `formatCompact`, `initials`.

### Layout & page
- `src/app/layout.tsx` — `<html lang="hy">`, Inter font, `ThemeProvider` (next-themes, attribute="class", defaultTheme="dark"), Sonner `Toaster` (richColors, closeButton, bottom-right), graphite body.
- `src/app/page.tsx` — minimal branded placeholder listing the 11 registered modules (full app shell is Task 2).

## Hand-off notes for downstream agents (Tasks 2–11)

- **Module views (Tasks 3–11):** import your view into `src/lib/modules/registry.ts` and replace `placeholderFor("<id>")` with your component for the matching module id. Leave the rest of the manifest metadata intact.
- **App shell (Task 2):** read `activeModule`/`setActiveModule` from `useAppStore`, then render `getModule(activeModule)?.component`. Sidebar should iterate `listModules()` grouped by `category`. The store already tracks sidebar/command/ownerAi/search state.
- **i18n:** `useLocale()` from any client component gives `{ locale, setLocale, t }`. Add new keys to all three locale blocks.
- **Mock data:** import from `@/lib/mock` (barrel). All records are `orgId: "org_haydev"`.
- **Theme tokens:** `bg-background`, `text-foreground`, `bg-card`, `text-lime`/`text-cyan`/`text-amber`/`text-rose`/`text-violet`, `glow-lime`/`glow-cyan`, `glass`, `surface-elevated`, `text-gradient-brand`, `bg-grid`, `bg-radial-glow`.
- **Status styling:** `statusColor(status)` → `toneClasses(tone)` for consistent badges across modules.
- **Circular import caution:** `app-store.ts` intentionally does NOT import `DEFAULT_LOCALE` from `i18n.ts` (it hardcodes `"hy"`). If you refactor locale defaults, keep these two in sync.

## Files created/modified

| File | Action |
|---|---|
| `prisma/schema.prisma` | replaced (23 models) |
| `src/app/globals.css` | replaced (dark enterprise theme) |
| `src/lib/i18n.ts` | new |
| `src/lib/store/app-store.ts` | new |
| `src/lib/modules/registry.ts` | new |
| `src/lib/modules/placeholder.tsx` | new |
| `src/lib/utils.ts` | extended (formatters) |
| `src/lib/mock/types.ts` | new |
| `src/lib/mock/leads.ts` | new |
| `src/lib/mock/quotes.ts` | new |
| `src/lib/mock/products.ts` | new |
| `src/lib/mock/documents.ts` | new |
| `src/lib/mock/automations.ts` | new |
| `src/lib/mock/customers.ts` | new |
| `src/lib/mock/invoices.ts` | new |
| `src/lib/mock/integrations.ts` | new |
| `src/lib/mock/notifications.ts` | new |
| `src/lib/mock/auditLogs.ts` | new |
| `src/lib/mock/kpis.ts` | new |
| `src/lib/mock/index.ts` | new (barrel) |
| `src/lib/seed.ts` | new (optional DB seed) |
| `src/app/layout.tsx` | replaced (ThemeProvider + Sonner + lang=hy) |
| `src/app/page.tsx` | replaced (minimal placeholder) |
