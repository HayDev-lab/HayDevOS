# Task 11 — Business Audit (agent record)

**Agent:** full-stack-developer (Business Audit)
**Task ID:** 11
**Status:** ✅ Complete
**Verified:** `bunx eslint src/modules/audit/ src/lib/i18n.ts src/lib/modules/registry.ts` — 0 errors · `bunx tsc --noEmit` — 0 errors in audit module · `audit` slot wired into registry · dev server returns 200 OK

## What landed

### Module structure (`src/modules/audit/`)

| File | Purpose |
|---|---|
| `index.ts` | Public barrel. Default + named export `BusinessAuditView`. Re-exports the full type surface, the deterministic scoring engine (`computeScores`, `computeReport`, `contributionFor`, …), the versioned questionnaire (`QUESTIONS`, `QUESTIONNAIRE_VERSION`, `TOTAL_QUESTIONS`), and the in-memory data layer (`HISTORY_RUNS`, `LATEST_RUN`, `DEMO_ANSWERS`, `RECOMMENDATIONS`, `prioritize`, `latestAuditSummary`, `trendSeries`). |
| `types.ts` | Typed domain model: `CategoryId` (6), `Category`, `QuestionType` (scale/yesno/single/multi), `QuestionOption`, `Question` (id/category/ref/type/text/evidencePrompt/weight/options/scaleLabels/hint/relatedModule), `Answer` (value + evidence), `AnswerMap`, `CategoryScore`, `Gap`, `AutomationOpportunity`, `Maturity` (manual/assisted/automated/optimized), `RecommendedModule`, `AuditReport`, `AuditMode`, `AuditRunSummary`, `RecommendationTemplate`, `PrioritizedRecommendation`, `AuditSettings` (gap/good/needsWork thresholds). Helpers: `CATEGORY_LIST`, `CATEGORY_BY_ID`, `MATURITY_ORDER`, `MATURITY_TONE`, `pickL10n`, `impactTone`, `scoreTone`, `DEFAULT_AUDIT_SETTINGS`. |
| `questionnaire.ts` | Versioned questionnaire. `QUESTIONNAIRE_VERSION = "2025.1"`. 6 categories × 6–7 questions = **40 questions**, every question fully localized in HY/RU/EN (text, hint, evidencePrompt, scale anchors, options). Each option carries an explicit normalized 0..1 `value` so scoring is deterministic. Each question carries an optional `relatedModule` for gap-driven module recommendations. |
| `scoring.ts` | **Pure, deterministic scoring engine.** `ALGORITHM_VERSION = "1.0.0"`. `SCORE_VERSION = "Q2025.1:S1.0.0"` — derived from questionnaire version + algorithm version, surfaced prominently on every report. `contributionFor()` maps every answer type to a 0..1 contribution (scale=(v-1)/4, yesno=option.value, single=option.value, multi=Σselected/Σall capped at 1). `categoryScore()` = weight-weighted avg × 100. `overallScore()` = category-weighted avg across the six categories. `computeGaps()` returns answered questions below the gap threshold (sorted by impact high→low then by depth). `computeOpportunities()` derives 7 process-level opportunities (lead_capture, sales_followups, document_intake, order_to_invoice, payment_tracking, automation_catalog, ai_use_cases) with current → target maturity. `computeRecommendedModules()` aggregates gaps by `relatedModule` and ranks by evidence count. `computeScores()` is the top-level pure entry: same answers → same scores, always. **No LLM, no `Date.now()`, no Math.random()**. |
| `data.ts` | In-memory data layer. `DEMO_ANSWERS` (mid-maturity org: strong acquisition, weak AI/data) used by the Demo mode. `HISTORY_RUNS` (6 past audits, computed deterministically at module init from answer profiles spanning Q3 2024 → Q3 2025, scores ~32 → ~78). `LATEST_RUN` = most recent. Helpers: `getRun(id)`, `listRunSummaries()`, `freshReport(answers, mode, label?)`, `prioritize(gaps)` → ranked `PrioritizedRecommendation[]`, `latestAuditSummary()` for Control, `trendSeries()` for trend charts. `RECOMMENDATIONS` — 5 recommendation templates (QuoteFlow, DocumentFlow, ERP Hub link, Autopilot governance, AI policy + Owner AI), each with `triggerRefs` tied to specific question refs. |
| `BusinessAuditView.tsx` | Top-level view. 7 tabs (Questionnaire · Report · History · Compare · Automation Map · Recommendations · Settings). Sticky module header with `DeterministicBadge` + run count. Holds the live in-memory `answers` state so Questionnaire and Report stay in sync; defaults `activeReport` to `LATEST_RUN`. `handleSubmit()` calls `freshReport(answers, mode)` (pure compute) → switches to Report tab. Re-exports `computeScores` so the Owner AI (Task 10) can call into the deterministic engine to explain a historical score without re-running it. |
| `components/shared.tsx` | UI primitives: `ScoreGauge` (big recharts RadialBarChart, 270° sweep, score-band colour, animated count-up), `MiniScoreGauge` (compact 84px version for category cards), `ScoreBadge`, `ScoreBar` (linear with optional threshold markers), `ImpactBadge` (high=rose, medium=amber, low=cyan), `MaturityBadge` (manual=rose → optimized=lime), `DeterministicBadge` (lime "Deterministic" pill with ShieldCheck icon + tooltip). Exports `TONE_COLOR`/`TONE_TEXT`/`TONE_BG` maps. |
| `components/QuestionnaireView.tsx` | Interactive questionnaire. Mode toggle (Current/Demo), per-category sidebar with progress bars, 4 question-type renderers: `ScaleControl` (1–5 slider with localized anchors), `YesNoControl` (Yes/No toggle, yes=lime, no=rose), `SingleControl` (radio cards with contribution-tone dot), `MultiControl` (chip toggles with checkmark). Per-question evidence field (collapsible Textarea). Load Demo + Reset + Submit actions. Progress bar with "Ready to submit" indicator. Prev/Next category nav. All chrome via `t()`, all question content via `pickL10n()`. |
| `components/ReportView.tsx` | Full audit report. Hero: big ScoreGauge + score-version metadata grid + PDF/DOCX/Share actions (toasts) + "Deterministic — no AI mutation" badge + immutable-note paragraph. 6 category score cards (mini gauge + bar with threshold markers). Gaps list (ScrollArea, impact badge + ref + question + evidence + related-module pill). Automation opportunities (current → target maturity + impact + drill-down). Recommended HayDev modules (clickable cards → `setActiveModule`). Answer evidence table (ref + question + answer + evidence). |
| `components/HistoryView.tsx` | Past audits table: date + label + mode + overall badge + 6 per-category mini-bars + score version. Row click → load that report. "Start new audit" button. Sticky header in ScrollArea. |
| `components/CompareView.tsx` | Compare over time. Run selector chips (2–4, colour-coded). Line chart (overall solid + categories dashed, recharts). Radar chart (per-category, one series per selected run, recharts). Delta table (first → last, per-category, with improved/declined/flat trend). No fake ROI — only deterministic deltas. |
| `components/AutomationMapView.tsx` | Visual maturity map. Summary strip (count per maturity level). Maturity matrix: rows = processes, columns = manual/assisted/automated/optimized, with current position (filled dot), target (dashed circle), past (small dot). Legend. Detail cards per process with current → target maturity badges + drill-down. |
| `components/RecommendationsView.tsx` | Prioritized recommendations. Ordered list (rank #1..N), each card: title, impact badge, effort badge (low/medium/high with icon), rationale (localized), triggered-by evidence chips (question refs), recommended module label + "Open module" button → `setActiveModule`. Footnote about determinism. |
| `components/SettingsView.tsx` | Audit engine settings. Versioning section (QV/AV/SV — all read-only, with the "immutable" note). Threshold sliders (gap / needs-work / good) with live band preview (rose/amber/lime strip). Save / Reset / Export config / Reset demo state actions. Danger-zone section for demo state reset. |

### Foundation modifications

| File | Change |
|---|---|
| `src/lib/i18n.ts` | Appended ~140 `audit.*` keys × 3 locales (hy/ru/en) covering every visible string in the module — subtitle, deterministic badge, score bands, impact, effort, maturity, categories, modes, progress, actions, toasts, question evidence, tabs, report headers, history, compare, automation map, recommendations, settings, empty states. |
| `src/lib/modules/registry.ts` | Imported `BusinessAuditView` from `@/modules/audit` and replaced `placeholderFor("audit")` with it. Only the `audit` entry was touched — the other 10 module entries are untouched. |

## Verification

- ✅ `bunx eslint src/modules/audit/ src/lib/i18n.ts src/lib/modules/registry.ts` — 0 errors, 0 warnings
- ✅ `bunx tsc --noEmit` — 0 errors in any `src/modules/audit/**` file or in `src/lib/i18n.ts` / `src/lib/modules/registry.ts`
- ✅ Default export `BusinessAuditView` reachable from `@/modules/audit`
- ✅ `audit` slot in the registry now renders the real view (was placeholder)
- ✅ Dev server returns `GET / 200` with the audit module compiled cleanly
- ✅ All visible strings flow through `t()` (chrome) and `pickL10n()` (question content)
- ✅ Premium dark enterprise theme honoured — graphite surfaces, lime (good ≥70) / cyan / amber (50–69) / rose (<50) accents, NO indigo/blue
- ✅ Deterministic scoring: `computeScores(answers)` is pure — no LLM, no `Date.now()`, no `Math.random()`. Same answers → same scores, always.
- ✅ `scoreVersion = "Q2025.1:S1.0.0"` persisted on every `AuditReport`; Owner AI may explain but not alter historical scores
- ✅ Full HY/RU/EN localization (Armenian default)
- ✅ Current + Demo modes; demo answers loadable in one click
- ✅ 6 past audit runs (Q3 2024 → Q3 2025, ~32 → ~78 overall) for History + Compare tabs
- ✅ Radar chart for category comparison across runs; line chart for overall trend
- ✅ Automation maturity matrix (manual / assisted / automated / optimized) with current vs target
- ✅ Prioritized recommendations with evidence chips tied to specific question refs; "Open module" wires into `setActiveModule`
- ✅ No fake ROI — only qualitative impact (high/medium/low)
- ✅ Responsive — tables wrapped in ScrollArea; card grids collapse 3→2→1 columns; sidebar goes vertical on mobile

## Key design decisions

1. **Determinism is the contract.** `computeScores(answers)` is pure — same answers always produce the same `AuditReport`. `scoreVersion = "Q2025.1:S1.0.0"` is derived from `QUESTIONNAIRE_VERSION` + `ALGORITHM_VERSION` so any change to the question set OR the math requires a deliberate bump. Historical `AuditReport.scoreVersion` always reads back the algorithm that produced it. The Owner AI (Task 10) may explain a historical score but cannot rewrite it — the report's `scoreVersion` is the audit trail.

2. **Contribution-based scoring** — every question type reduces to a 0..1 contribution. Scale=(v-1)/4, yesno/single=option.value, multi=Σselected/Σall capped at 1. The category score is the weight-weighted average × 100. The overall score is the category-weighted average (categories with more weight carry more gravity). This means a category with 7 weighted-2 questions matters more than one with 6 weighted-1 questions.

3. **Gaps + opportunities + recommendations are all derived from the same gap analysis.** No separate LLM pass. A `Gap` is any answered question with contribution < `gapThreshold` (default 0.5). `AutomationOpportunity` is derived from a fixed set of process-anchored questions (lead_capture, sales_followups, document_intake, order_to_invoice, payment_tracking, automation_catalog, ai_use_cases) — each maps to a current maturity stage and a target one step up. `RecommendedModule` aggregates gaps by `relatedModule` and ranks by evidence count. `PrioritizedRecommendation` uses `prioritize()` to weight each template by impact × number of triggered refs.

4. **No fake ROI.** Only qualitative impact (high/medium/low) and qualitative effort (low/medium/high). No "save $X" or "save Y hours" claims. The footnote on the Recommendations tab explicitly states recommendations are deterministic — derived from the same gap analysis that produced the score.

5. **6 past audits spanning a year** are computed deterministically from stored answer profiles at module init. The Q3 2024 baseline scores ~32 (early-stage: paper + Excel), Q4 2024 ~42, Q1 2025 ~52, Q2 2025 ~62, Q3 2025 demo ~67, Q3 2025 baseline ~78 (mature: ERP + automation engine + AI policy). This gives the History + Compare tabs realistic data without any hand-written score numbers — the scores fall out of the answers via the same `computeReport()` that produces fresh reports.

6. **Re-export `computeScores` from `BusinessAuditView`** so the Owner AI (Task 10) can call into the deterministic engine to explain a historical score without re-running it. The Control module (Task 9) can also import `latestAuditSummary()` and `trendSeries()` to surface audit trends in the executive snapshot.

7. **Score-band colours are deterministic and threshold-driven** — lime ≥70, amber 50–69, rose <50 (defaults; operator-tunable in Settings). The `ScoreGauge`/`MiniScoreGauge`/`ScoreBadge`/`ScoreBar` all read the same `scoreTone(score, settings)` helper so the band stays consistent everywhere. The Settings tab exposes a live band-preview strip so the operator can see the bands before applying.

8. **Questionnaire UX** — category sidebar with per-category progress bars, type-specific controls (slider for scale, two-button toggle for yesno, radio cards for single, chip toggles for multi), collapsible evidence textarea per question, prev/next category nav, sticky progress bar with "Ready to submit" indicator, and a one-click "Load demo answers" action so a first-time visitor can see a full report immediately.

9. **Automation maturity matrix** is a 4-column grid (manual / assisted / automated / optimized) where each process is plotted at its current position (filled dot) with a dashed circle at the target position. Past positions get a small dot. This is the most information-dense view in the module — the user sees at a glance where each process sits and the next step up.

10. **Determinism badge everywhere** — the lime "Deterministic" pill with ShieldCheck icon appears in the module header, on every report hero, and is the title attribute of the score-version metadata. The footnote on the Recommendations tab and the immutable-note on the Report hero both state explicitly that the Owner AI may explain but cannot alter historical scores.

## Hand-off notes for downstream agents

- The `audit` module slot in `registry.ts` is now taken. The remaining placeholders are: `ownerAi` (Task 10) and `settings`.
- The `audit.*` i18n keys are added to all three locale blocks. They cover the entire module surface — downstream agents don't need to add more.
- `computeScores` is exported from `BusinessAuditView` (re-export) and from `@/modules/audit` (barrel). The Owner AI (Task 10) can import it to explain a historical score by passing the stored `answers` and re-running the pure function — the output will match the persisted `scoreVersion` byte-for-byte.
- `latestAuditSummary()` and `trendSeries()` are exported from `@/modules/audit` for the Control module (Task 9) to surface audit trends in the executive snapshot.
- The questionnaire version is `2025.1` and the algorithm version is `1.0.0`. If you change the question set or the scoring math, bump `QUESTIONNAIRE_VERSION` in `questionnaire.ts` or `ALGORITHM_VERSION` in `scoring.ts` respectively. The `SCORE_VERSION` is derived automatically.
- The 6 historical runs are computed at module init from answer profiles in `data.ts`. If you want to add more runs, add a new `ProfileSeed` to the `PROFILES` array — the report will be computed deterministically from the answers.
- The `DEMO_ANSWERS` map in `data.ts` is the canonical demo profile. The Q3 2025 demo historical run reuses it (via `Object.values(DEMO_ANSWERS).map(a => ({...a}))`) so they stay in sync.
- The `prioritize()` function in `data.ts` is the single source of truth for recommendation ranking. It weights each template by `triggeredBy.length × impactWeight` (high=3, medium=2, low=1).

## Files created/modified

| File | Action |
|---|---|
| `src/modules/audit/index.ts` | new (barrel) |
| `src/modules/audit/types.ts` | new (typed domain model) |
| `src/modules/audit/questionnaire.ts` | new (versioned HY/RU/EN questionnaire, 40 questions) |
| `src/modules/audit/scoring.ts` | new (deterministic scoring engine) |
| `src/modules/audit/data.ts` | new (history + demo + recommendations catalog) |
| `src/modules/audit/BusinessAuditView.tsx` | new (7-tab view) |
| `src/modules/audit/components/shared.tsx` | new (ScoreGauge + badges) |
| `src/modules/audit/components/QuestionnaireView.tsx` | new |
| `src/modules/audit/components/ReportView.tsx` | new |
| `src/modules/audit/components/HistoryView.tsx` | new |
| `src/modules/audit/components/CompareView.tsx` | new |
| `src/modules/audit/components/AutomationMapView.tsx` | new |
| `src/modules/audit/components/RecommendationsView.tsx` | new |
| `src/modules/audit/components/SettingsView.tsx` | new |
| `src/lib/i18n.ts` | extended (+~140 keys × 3 locales) |
| `src/lib/modules/registry.ts` | wired `BusinessAuditView` into audit slot |
