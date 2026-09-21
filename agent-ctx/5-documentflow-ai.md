# Task 5 — DocumentFlow AI (agent record)

**Agent:** full-stack-developer (DocumentFlow AI)
**Task ID:** 5
**Status:** ✅ Complete (verified pre-existing files from a prior timed-out run, fixed 3 TS errors, added missing `types.ts`)
**Verified:** `bunx eslint src/modules/documentflow/ src/lib/i18n.ts src/lib/modules/registry.ts` clean · `bunx tsc --noEmit` shows zero errors in documentflow files · dev server returns 200 for `/?module=docsmart` with clean compile

## What landed

### Module structure (`src/modules/documentflow/`)

| File | Purpose |
|---|---|
| `index.ts` | Public barrel. Default-exports `DocumentFlowView`; re-exports the typed surface from `./types`. |
| `types.ts` (NEW) | Domain type surface — re-exports all DocumentFlow types from `data.ts` (canonical home, avoids circular split). |
| `data.ts` | In-memory data layer + types + pipeline simulation helpers. 14 documents spanning every status/stage/classification, 7 batches, 5 extraction schemas, 21 jobs, 6 workers, 6 exports, AI providers, OCR packs, MIME limits, storage config, 4 analytics series, KPIs. Helpers: `typeFromMime`, `fauxExcerptFor`, `classifySample`, `buildSampleFields`, `buildNewDocument`, `stageToStatus`, plus `PIPELINE_STAGES`, `STAGE_PROGRESS`, `SAMPLE_FILES`, `ACCEPTED_MIME_TYPES`, `MAX_FILE_SIZE_MB`. |
| `DocumentFlowView.tsx` | 9-tab view (Inbox · Documents · Batches · Review Queue · Schemas · Jobs · Exports · Analytics · Settings). Owns in-memory state for documents/batches/schemas/jobs/exports/workers. Runs a 1.5s interval pipeline simulator that advances any document in an active stage (ingest→parse→ocr→classify→extract→validate→review), with side-effects: classify stage sets `classification`+`confidence`+`ocrLang`; extract stage calls `buildSampleFields`; review stage sets `status: reviewed`. Stops at review (awaiting human action) or export (terminal). Tab badge counts on Inbox/Review Queue/Jobs. |
| `shared.tsx` | Reusable UI: `FileTypeIcon`/`FileTypeBadge` (lucide FileText/FileSpreadsheet/FileImage with subtle colored backgrounds per type), `StatusBadge`, `ClassBadge`, `JobStatusBadge`, `BatchStatusBadge`, `ExportStatusBadge`, `ExportFormatBadge`, `ConfidenceBar` (thin bar: green >0.9, amber 0.7-0.9, red <0.7), `ValidationPill`, `PipelineStepper` (compact + full), `JobTypePill`, `formatBytes`/`formatDuration`/`formatOffsetRange`, `ExcerptLine` (highlights matched offsets with `<mark>`). |
| `components/InboxView.tsx` | Recent uploads list (filename, type icon, size, uploadedBy, status, classification badge, confidence, compact pipeline stepper). Status + type filters. Multi-select with bulk actions (Classify / Extract / Approve / Delete). Upload button → UploadDialog. |
| `components/UploadDialog.tsx` | Dropzone + hidden file input. MIME validation (pdf/docx/xlsx/csv/txt/png/jpg) with extension fallback when browser `type` is empty. 25 MB size warning. 8 sample-file quick-pick buttons. Per-file progress simulation (Queued → Uploading → Processing → commit) via `setTimeout`/`setInterval`. Emits fresh `DocRecord[]` via `buildNewDocument` so the parent's pipeline simulator takes over. |
| `components/DocumentsView.tsx` | Full documents table + advanced filters: query, status, type, classification, uploader, date-from/date-to. Row click → DocumentViewer. Responsive column hiding via `sm:`/`md:`/`lg:`/`xl:` prefixes. |
| `components/DocumentViewer.tsx` | Split-pane via `react-resizable-panels`. LEFT: stylised page preview with type-specific faux excerpts (invoice/contract/receipt/id/form/other), OCR-language badge, page count. RIGHT: classification banner with overall doc confidence; extracted fields list with key/value/confidence-bar/validation-pill/provenance-row (`page 2, offsets [12–18], confidence 0.94, validation: valid` + highlighted `<mark>` excerpt); inline Accept / Correct / Reject / Not-found review actions (correcting mode is an inline input with Enter to commit / Esc to cancel); version-history timeline (newest first, lime dot for latest); Approve / Reject document actions in the header. |
| `components/ReviewQueueView.tsx` | Stats row (pending / reviewed today / avg confidence / total fields). Queue of low-confidence / warning / invalid / unreviewed fields sorted ascending by confidence. Quick-accept + open-in-viewer per row. Empty state with lime check. |
| `components/BatchesView.tsx` | Upload batches (name, count, status, avg progress, created). Expandable rows (Collapsible) revealing the batch's documents with type icon + filename + class + status badges. Click → viewer. |
| `components/SchemasView.tsx` | Extraction schemas (Invoice / Contract / Receipt / ID / Custom) as cards with editable name + classification multi-toggle + fields table (key, type, required, validation). CRUD via local draft state + Save/Delete + toast. Add-field / remove-field inline. |
| `components/JobsView.tsx` | Worker-pool summary cards (workers, queue depth, running, failed) + per-worker chips (busy=amber pulsing, idle=lime) + jobs table (type pill, document, status, worker, started, duration, retries). Status filter. Retries badge color-graded (×2+ rose, ×1 amber). |
| `components/ExportsView.tsx` | New-export bar (format Select: CSV / JSON / QuickBooks / SAP / Dynamics) + exports list (target, format badge, records, status, created, by) with Download (success-only) + Re-run actions. |
| `components/AnalyticsView.tsx` | 4 KPI cards (total processed, avg time, error rate, avg confidence) + 4 recharts charts: stacked AreaChart (processed-over-time by classification, 14 days), horizontal BarChart (by type, per-bar color), BarChart (confidence distribution rose/amber/lime buckets), AreaChart (review throughput 14 days). All theme-token colors, all `isAnimationActive` defaults. |
| `components/SettingsView.tsx` | AI provider cards (Ollama Cloud enabled + OpenAI disabled) with endpoint/model/masked-API-key + reveal Eye toggle + enable Switch. OCR language packs (hy/ru/en) toggles. MIME limits table with editable max-size Input + enable Switch per type. Storage config read-only display with SSE-KMS encryption badge. |

### Foundation modifications

| File | Change |
|---|---|
| `src/lib/i18n.ts` | 207 `docflow.*` keys × 3 locales (hy/ru/en) already appended by the prior run. Verified all three blocks have identical key counts. No edit made (no missing keys). |
| `src/lib/modules/registry.ts` | The `docsmart` slot's `component` field was already set to `DocumentFlowView` by the prior run. Verified, no edit needed. The other 5 module placeholders (`connect`, `control`, `ownerAi`, `audit`, `settings`) are untouched. |

## Verification

- ✅ `bunx eslint src/modules/documentflow/ src/lib/i18n.ts src/lib/modules/registry.ts` — 0 errors, 0 warnings
- ✅ `bunx tsc --noEmit` — 0 errors in any `src/modules/documentflow/**` file (other pre-existing errors in `examples/` and `skills/` dirs are out of scope)
- ✅ Dev server (`bun run dev`) — returns 200 for `/?module=docsmart` in 283ms with `✓ Compiled in 297ms` and zero runtime errors
- ✅ All visible strings flow through `t()` from `useLocale()`
- ✅ Premium dark enterprise aesthetic — graphite surfaces, lime=approved/valid, cyan=info, amber=pending-review/low-confidence, rose=rejected/failed/invalid; NO indigo/blue
- ✅ Provenance display rendered nicely: `page 2, offsets [12–18], confidence 0.94, validation: valid` + highlighted excerpt
- ✅ Document type icons (lucide FileText/FileSpreadsheet/FileImage/Sheet/FileType2) with subtle colored backgrounds per type
- ✅ Confidence thin bar color-graded (green >0.9, amber 0.7-0.9, red <0.7)
- ✅ Split-pane viewer resizable via `react-resizable-panels`
- ✅ Responsive — tables wrapped in `ScrollArea` with sticky headers; card grids collapse 4→2→1; viewer goes max-w-7xl
- ✅ Pipeline simulator advancing every 1.5s through pending→processing(parse)→processing(OCR)→classified→extracted→awaiting review→reviewed→approved

## Key design decisions

1. **Pipeline simulation via `setInterval` + functional `setDocuments`** — the parent `DocumentFlowView` owns the document state and runs a 1.5s interval that walks every document one stage forward via the functional `setState` form (so the callback always sees the latest state). The viewer document is derived (`documents.find(...)`) rather than stored separately, so it stays live without a sync effect.
2. **Classification + field extraction happen as side-effects of stage transitions** — when a doc reaches `classify` and has no classification yet, the simulator calls `classifySample(filename)` and stamps `classification` + `confidence` + `ocrLang`. When it reaches `extract` and has no fields, it calls `buildSampleFields(classification, filename)` to populate the field list. Both side-effects also append a version-history entry.
3. **Provenance is the centerpiece of the field row** — every extracted field carries `{ page, excerpt, offsets }` provenance rendered as a small bordered panel beneath the value, with the matched substring highlighted via `<mark className="bg-amber/20 text-amber">`. Confidence, validation pill, and review-action badge round out the row.
4. **Review actions are inline + immediate** — Accept / Correct / Reject / Not-found are 4 ghost buttons at the bottom of each field row. Correct enters an inline input mode (Enter commits, Esc cancels) rather than a separate dialog. Each action updates the field's `reviewAction` + `validation` + `correctedValue` and writes back through `onUpdateDoc`.
5. **Split-pane viewer uses `react-resizable-panels`** with a 48/52 default and 30/35 minimums, plus a drag handle. The left panel renders a stylised "page" with a header (type + page count + OCR-lang badge), a `<pre>` body with the faux excerpt, and a footer stub. The right panel scrolls independently with sticky-ish sections.
6. **Confidence colors drive everything** — `confidenceTone(c)` returns `"lime" | "amber" | "rose"` and is used for the thin bar fill, the numeric label, and the field-row confidence text. This keeps the color system consistent across inbox / documents / review queue / viewer / analytics.
7. **Schemas CRUD is mock-local** — the parent holds schemas in `useState`; `onSave`/`onDelete` mutate it. The schema card flips between view and edit modes via `editingId` + `draft` (deep-cloned via `JSON.parse(JSON.stringify)`). No backend.
8. **Jobs table worker chips are derived from `DocWorker[]`** — busy workers get an amber pulsing dot + amber chip; idle get a lime dot + muted chip. The summary cards (workers, queue depth, running, failed) are derived from the same arrays, so the board stays consistent.
9. **Analytics charts use recharts + CSS variables** — `var(--border)`, `var(--card)`, `var(--muted-foreground)`, `var(--foreground)` so they theme-flip with next-themes. Hex colors are only used where recharts needs literal fills (Area `stroke`/`stop`); they map to the same hues as the CSS tokens (lime `#a3e635`, cyan `#22d3ee`, amber `#f59e0b`, rose `#f43f5e`, violet `#c084fc`).
10. **`types.ts` is a barrel, not a definition file** — the canonical definitions live in `data.ts` because `data.ts` already imports `DocumentStatus`/`DocumentClass` from `@/lib/mock/types` and would create a circular `types ↔ data` split if definitions moved out. The `types.ts` barrel re-exports them so external consumers have a single typed entry-point.

## Hand-off notes for downstream agents

- The `docsmart` module slot in `registry.ts` is now taken. The remaining placeholders are: `connect`, `control`, `ownerAi`, `audit`, `settings`.
- The `docflow.*` i18n keys are added to all three locale blocks (207 keys × 3 = 621 lines in i18n.ts). They cover the entire module surface — downstream agents don't need to add more for this module.
- The pipeline simulator runs at the module level (in `DocumentFlowView`) — if you want to extend it (e.g., add an `integrate` stage between `export` and a future audit), update `PIPELINE_STAGES` + `STAGE_PROGRESS` + `stageToStatus` + `ACTIVE_STAGES` in `data.ts` and `DocumentFlowView.tsx` respectively.
- `buildSampleFields(classification, filename)` is the single source of truth for what fields a freshly-extracted document gets. If you add a new `DocumentClass`, update both `classifySample` and `buildSampleFields` accordingly.
- The `DocFieldProvenance` shape is `{ page, excerpt, offsets: [start, end] }`. The `ExcerptLine` component safely clamps offsets to the excerpt length, so out-of-range offsets won't crash the UI.
- The viewer is a `Dialog` (not a Sheet) — `max-w-7xl` + `h-[72vh]` ResizablePanelGroup. If you want to make it full-screen, change the `max-w-7xl` to `max-w-screen-2xl` and the panel-group height to `h-[85vh]`.

## Files created/modified

| File | Action |
|---|---|
| `src/modules/documentflow/index.ts` | updated (added `./types` re-export) |
| `src/modules/documentflow/types.ts` | NEW (domain type barrel) |
| `src/modules/documentflow/data.ts` | patched (fixed `DocClass` → `DocumentClass` typo at line 126) |
| `src/modules/documentflow/DocumentFlowView.tsx` | unchanged (verified complete) |
| `src/modules/documentflow/shared.tsx` | unchanged (verified complete) |
| `src/modules/documentflow/components/InboxView.tsx` | unchanged (verified complete) |
| `src/modules/documentflow/components/UploadDialog.tsx` | patched (tightened `extFromMime` return type to `DocType` + imported the type) |
| `src/modules/documentflow/components/DocumentsView.tsx` | unchanged (verified complete) |
| `src/modules/documentflow/components/DocumentViewer.tsx` | unchanged (verified complete) |
| `src/modules/documentflow/components/ReviewQueueView.tsx` | unchanged (verified complete) |
| `src/modules/documentflow/components/BatchesView.tsx` | unchanged (verified complete) |
| `src/modules/documentflow/components/SchemasView.tsx` | unchanged (verified complete) |
| `src/modules/documentflow/components/JobsView.tsx` | unchanged (verified complete) |
| `src/modules/documentflow/components/ExportsView.tsx` | unchanged (verified complete) |
| `src/modules/documentflow/components/AnalyticsView.tsx` | unchanged (verified complete) |
| `src/modules/documentflow/components/SettingsView.tsx` | unchanged (verified complete) |
| `src/lib/i18n.ts` | unchanged (verified — 207 keys × 3 locales already present) |
| `src/lib/modules/registry.ts` | unchanged (verified — `docsmart` slot already wired to `DocumentFlowView`) |
