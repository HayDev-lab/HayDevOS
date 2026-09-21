/**
 * HayDevOS Business Audit — in-memory data layer.
 *
 * Holds:
 *  - `DEMO_ANSWERS` — preset answers used by the "Demo" mode toggle in the
 *    questionnaire, so a first-time visitor can see a full report immediately.
 *  - `HISTORY_RUNS` — 6 past `AuditReport`s with varied scores and dates so
 *    the History + Compare tabs have realistic data. Each is computed
 *    deterministically from a stored answer profile via `computeReport`.
 *  - `RECOMMENDATIONS` — a recommendation-template catalog (5 templates),
 *    prioritized at render time based on which trigger refs are gaps.
 *  - Helpers: `getRun(id)`, `listRunSummaries()`, `prioritize()`.
 */

import type {
  Answer,
  AnswerMap,
  AuditReport,
  AuditRunSummary,
  CategoryId,
  PrioritizedRecommendation,
  RecommendationTemplate,
} from "./types";
import { CATEGORY_LIST } from "./types";
import { QUESTION_BY_ID, QUESTION_BY_REF, QUESTIONNAIRE_VERSION } from "./questionnaire";
import { computeReport, computeScores, SCORE_VERSION } from "./scoring";

const ORG_ID = "org_haydev";

// ─────────────────────────────────────────────────────────────────────────────
// Answer builder
// ─────────────────────────────────────────────────────────────────────────────

/** Build a typed Answer from a question ref + raw value + optional evidence. */
function mk(
  ref: string,
  value: number | boolean | string | string[],
  evidence?: string,
): Answer {
  const q = QUESTION_BY_REF[ref];
  if (!q) throw new Error(`Unknown question ref: ${ref}`);
  return { questionId: q.id, value, evidence };
}

/** Build an answer map from a list of answers. */
function buildMap(answers: Answer[]): AnswerMap {
  const map: AnswerMap = {};
  for (const a of answers) map[a.questionId] = a;
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO answers — a mid-maturity org with strong acquisition but weak AI/data
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_ANSWERS: AnswerMap = buildMap([
  // Acquisition — multi-channel + unified CRM, decent SLA
  mk("acq_01", "multi_conn", "Meta + Google + referrals, all into LeadOS"),
  mk("acq_02", true, "Meta Lead Ads → LeadOS webhook"),
  mk("acq_03", 4, "Conversion ~22% to meeting"),
  mk("acq_04", ["meta", "google", "organic", "referral"], "Active measured channels"),
  mk("acq_05", true, "15-minute first-response SLA"),
  mk("acq_06", "channel", "CAC tracked per channel, not cohort yet"),
  mk("acq_07", 3, "Booking rate ~22%"),
  // Sales — basic CRM, no versioning on quotes
  mk("sal_01", "crm_stages", "LeadOS pipeline + stages"),
  mk("sal_02", false, "Quotes sent as PDF, no version history"),
  mk("sal_03", false, "Manual PDF signing, no e-sign"),
  mk("sal_04", 3, "Win-rate ~28%"),
  mk("sal_05", "rules_basic", "Basic price rules in spreadsheet"),
  mk("sal_06", false, "No forecasting yet"),
  mk("sal_07", ["assignment", "followups"], "Lead routing + reminders via Autopilot"),
  // Operations — OCR + manual review
  mk("ops_01", "ocr", "OCR + manual review for invoices"),
  mk("ops_02", true, "Review queue of 3 people"),
  mk("ops_03", 3, "5-day average fulfillment"),
  mk("ops_04", "erp_basic", "Basic ERP, not connected to payments"),
  mk("ops_05", false, "Payments tracked separately"),
  mk("ops_06", ["onboard", "fulfill"], "Onboarding + fulfillment documented"),
  // Data — partial unification
  mk("dat_01", "partial", "CRM + ERP disconnected"),
  mk("dat_02", 2, "Frequent duplicate issues"),
  mk("dat_03", false, "No dedup process"),
  mk("dat_04", ["crm_erp", "messengers"], "CRM-ERP not yet integrated, Telegram bot only"),
  mk("dat_05", "rbac", "Role-based access, no SSO"),
  mk("dat_06", true, "Nightly DB backup to S3"),
  // Automation — Zapier-style point tools
  mk("aut_01", "islands", "Zapier for a couple of flows"),
  mk("aut_02", false, "No approval flows"),
  mk("aut_03", 2, "Frequent failures, no retries"),
  mk("aut_04", ["lead_routing", "followups"], "Routing + reminders only"),
  mk("aut_05", false, "No observability"),
  mk("aut_06", "manual", "Manual check"),
  // AI Readiness — team-level, no policy
  mk("ai_01", "team", "Team uses ChatGPT but no org policy"),
  mk("ai_02", false, "No AI usage policy"),
  mk("ai_03", ["drafting"], "Drafting emails and quotes"),
  mk("ai_04", 2, "Heavy review required"),
  mk("ai_05", "ad_hoc", "Ad-hoc notes"),
  mk("ai_06", false, "No human-in-the-loop formalized"),
]);

// ─────────────────────────────────────────────────────────────────────────────
// History — 6 past audit runs (computed deterministically at module init).
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileSeed {
  id: string;
  createdAt: string;
  mode: "current" | "demo";
  label?: string;
  answers: Answer[];
}

/**
 * Each profile is a deliberately-different answer snapshot. They are intended
 * to span the journey from "early stage" (~32 overall) to "mature" (~78 overall).
 *
 * Times are pinned (not Date.now()) so the dataset is deterministic.
 */
const PROFILES: ProfileSeed[] = [
  {
    id: "audit_2024_q3",
    createdAt: "2024-09-15T10:30:00.000Z",
    mode: "current",
    label: "Q3 2024 baseline",
    answers: [
      // Acquisition — very early
      mk("acq_01", "manual"),
      mk("acq_02", false),
      mk("acq_03", 2, "Mostly unqualified leads"),
      mk("acq_04", ["referral"]),
      mk("acq_05", false),
      mk("acq_06", "none"),
      mk("acq_07", 2),
      // Sales — head + Excel
      mk("sal_01", "none"),
      mk("sal_02", false),
      mk("sal_03", false),
      mk("sal_04", 2, "Win-rate ~12%"),
      mk("sal_05", "manual"),
      mk("sal_06", false),
      mk("sal_07", []),
      // Operations — paper + manual
      mk("ops_01", "paper"),
      mk("ops_02", false),
      mk("ops_03", 2, "Frequent delays"),
      mk("ops_04", "manual"),
      mk("ops_05", false),
      mk("ops_06", []),
      // Data — siloed
      mk("dat_01", "silos"),
      mk("dat_02", 1),
      mk("dat_03", false),
      mk("dat_04", []),
      mk("dat_05", "shared"),
      mk("dat_06", false),
      // Automation — none
      mk("aut_01", "none"),
      mk("aut_02", false),
      mk("aut_03", 1),
      mk("aut_04", []),
      mk("aut_05", false),
      mk("aut_06", "none"),
      // AI — not used
      mk("ai_01", "none"),
      mk("ai_02", false),
      mk("ai_03", []),
      mk("ai_04", 1),
      mk("ai_05", "none"),
      mk("ai_06", false),
    ],
  },
  {
    id: "audit_2024_q4",
    createdAt: "2024-12-10T14:00:00.000Z",
    mode: "current",
    label: "Q4 2024 check-in",
    answers: [
      mk("acq_01", "single_ch"),
      mk("acq_02", false),
      mk("acq_03", 2),
      mk("acq_04", ["referral", "events"]),
      mk("acq_05", false),
      mk("acq_06", "guess"),
      mk("acq_07", 2),
      mk("sal_01", "sticky"),
      mk("sal_02", false),
      mk("sal_03", false),
      mk("sal_04", 2, "Win-rate ~15%"),
      mk("sal_05", "spreadsheet"),
      mk("sal_06", false),
      mk("sal_07", []),
      mk("ops_01", "email"),
      mk("ops_02", false),
      mk("ops_03", 2),
      mk("ops_04", "island"),
      mk("ops_05", false),
      mk("ops_06", ["onboard"]),
      mk("dat_01", "silos"),
      mk("dat_02", 2),
      mk("dat_03", false),
      mk("dat_04", ["messengers"]),
      mk("dat_05", "per_user"),
      mk("dat_06", false),
      mk("aut_01", "scripts"),
      mk("aut_02", false),
      mk("aut_03", 2),
      mk("aut_04", []),
      mk("aut_05", false),
      mk("aut_06", "manual"),
      mk("ai_01", "personal"),
      mk("ai_02", false),
      mk("ai_03", []),
      mk("ai_04", 2),
      mk("ai_05", "none"),
      mk("ai_06", false),
    ],
  },
  {
    id: "audit_2025_q1",
    createdAt: "2025-03-18T09:15:00.000Z",
    mode: "current",
    label: "Q1 2025 progress",
    answers: [
      mk("acq_01", "multi_ch"),
      mk("acq_02", true, "Basic webhook"),
      mk("acq_03", 3),
      mk("acq_04", ["meta", "referral", "organic"]),
      mk("acq_05", false),
      mk("acq_06", "channel"),
      mk("acq_07", 3),
      mk("sal_01", "crm_basic"),
      mk("sal_02", false),
      mk("sal_03", false),
      mk("sal_04", 3, "Win-rate ~22%"),
      mk("sal_05", "rules_basic"),
      mk("sal_06", false),
      mk("sal_07", ["followups"]),
      mk("ops_01", "email"),
      mk("ops_02", true, "Single reviewer"),
      mk("ops_03", 3),
      mk("ops_04", "erp_basic"),
      mk("ops_05", false),
      mk("ops_06", ["onboard", "fulfill"]),
      mk("dat_01", "partial"),
      mk("dat_02", 2),
      mk("dat_03", false),
      mk("dat_04", ["messengers"]),
      mk("dat_05", "per_user"),
      mk("dat_06", true, "Weekly backup"),
      mk("aut_01", "islands"),
      mk("aut_02", false),
      mk("aut_03", 2),
      mk("aut_04", ["followups"]),
      mk("aut_05", false),
      mk("aut_06", "manual"),
      mk("ai_01", "personal"),
      mk("ai_02", false),
      mk("ai_03", ["drafting"]),
      mk("ai_04", 2),
      mk("ai_05", "ad_hoc"),
      mk("ai_06", false),
    ],
  },
  {
    id: "audit_2025_q2",
    createdAt: "2025-06-22T11:45:00.000Z",
    mode: "current",
    label: "Q2 2025 mid-year",
    answers: [
      mk("acq_01", "multi_ch"),
      mk("acq_02", true),
      mk("acq_03", 3),
      mk("acq_04", ["meta", "google", "referral"]),
      mk("acq_05", true, "1-hour SLA"),
      mk("acq_06", "channel"),
      mk("acq_07", 3),
      mk("sal_01", "crm_basic"),
      mk("sal_02", true, "QuoteFlow versioning"),
      mk("sal_03", false),
      mk("sal_04", 3, "Win-rate ~25%"),
      mk("sal_05", "rules_basic"),
      mk("sal_06", false),
      mk("sal_07", ["assignment", "followups"]),
      mk("ops_01", "ocr"),
      mk("ops_02", true),
      mk("ops_03", 3),
      mk("ops_04", "erp_basic"),
      mk("ops_05", false),
      mk("ops_06", ["onboard", "fulfill"]),
      mk("dat_01", "partial"),
      mk("dat_02", 3),
      mk("dat_03", false),
      mk("dat_04", ["crm_erp", "messengers"]),
      mk("dat_05", "rbac"),
      mk("dat_06", true),
      mk("aut_01", "islands"),
      mk("aut_02", true, "Email + telegram approval"),
      mk("aut_03", 3),
      mk("aut_04", ["lead_routing", "followups"]),
      mk("aut_05", false),
      mk("aut_06", "basic"),
      mk("ai_01", "team"),
      mk("ai_02", false),
      mk("ai_03", ["drafting", "summarize"]),
      mk("ai_04", 2),
      mk("ai_05", "logs"),
      mk("ai_06", false),
    ],
  },
  {
    id: "audit_2025_q3_demo",
    createdAt: "2025-09-05T16:20:00.000Z",
    mode: "demo",
    label: "Q3 2025 demo",
    // Reuse the DEMO profile via buildMap to avoid drift.
    answers: Object.values(DEMO_ANSWERS).map((a) => ({ ...a })),
  },
  {
    id: "audit_2025_q3",
    createdAt: "2025-09-12T13:10:00.000Z",
    mode: "current",
    label: "Q3 2025 baseline",
    // Slightly better than the Q3 demo across the board.
    answers: [
      mk("acq_01", "attribution", "Multi-channel + attribution model"),
      mk("acq_02", true),
      mk("acq_03", 4, "Conversion ~28%"),
      mk("acq_04", ["meta", "google", "organic", "referral"]),
      mk("acq_05", true, "15-min SLA"),
      mk("acq_06", "cohort", "Cohort CAC analysis"),
      mk("acq_07", 4),
      mk("sal_01", "crm_forecast", "LeadOS + forecasting"),
      mk("sal_02", true, "QuoteFlow with versions"),
      mk("sal_03", true, "E-sign via DocSmart"),
      mk("sal_04", 4, "Win-rate ~32%"),
      mk("sal_05", "rules_adv", "Price books + tiering + approvals"),
      mk("sal_06", true, "Monthly forecast"),
      mk("sal_07", ["assignment", "followups", "quotes", "approvals", "sign"]),
      mk("ops_01", "auto_class", "Auto-classify + extract"),
      mk("ops_02", true, "Review queue + reviewers"),
      mk("ops_03", 4, "3-day average"),
      mk("ops_04", "erp_integrated"),
      mk("ops_05", true),
      mk("ops_06", ["onboard", "fulfill", "billing", "support"]),
      mk("dat_01", "central"),
      mk("dat_02", 4),
      mk("dat_03", true, "Monthly dedup"),
      mk("dat_04", ["crm_erp", "marketing", "finance", "messengers", "shipping"]),
      mk("dat_05", "sso_rbac"),
      mk("dat_06", true, "Daily backup + DR"),
      mk("aut_01", "engine"),
      mk("aut_02", true, "Risk-based approvals"),
      mk("aut_03", 4, "<2% failure rate"),
      mk("aut_04", ["lead_routing", "followups", "quote_gen", "doc_class", "billing"]),
      mk("aut_05", true, "30-day retention"),
      mk("aut_06", "governed"),
      mk("ai_01", "policy"),
      mk("ai_02", true),
      mk("ai_03", ["extraction", "summarize", "drafting", "routing", "assistant"]),
      mk("ai_04", 4),
      mk("ai_05", "versioned"),
      mk("ai_06", true, "HITL for risky actions"),
    ],
  },
];

/** Compute the full report for each profile at module init (pure + deterministic). */
export const HISTORY_RUNS: AuditReport[] = PROFILES.map((p) =>
  computeReport({
    id: p.id,
    orgId: ORG_ID,
    createdAt: p.createdAt,
    mode: p.mode,
    answers: buildMap(p.answers),
    label: p.label,
  }),
);

/** The most recent historical run by createdAt. */
export const LATEST_RUN: AuditReport = [...HISTORY_RUNS].sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
)[0];

/** Get a run by id. */
export function getRun(id: string): AuditReport | undefined {
  return HISTORY_RUNS.find((r) => r.id === id);
}

/** List run summaries (sorted newest-first). */
export function listRunSummaries(): AuditRunSummary[] {
  return [...HISTORY_RUNS]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      mode: r.mode,
      questionnaireVersion: r.questionnaireVersion,
      scoreVersion: r.scoreVersion,
      overall: r.overall,
      categories: r.categories.reduce<Record<CategoryId, number>>((acc, cs) => {
        acc[cs.categoryId] = cs.score;
        return acc;
      }, {} as Record<CategoryId, number>),
      label: r.label,
    }));
}

/** Compute a fresh report from arbitrary answers (used by the questionnaire). */
export function freshReport(
  answers: AnswerMap,
  mode: "current" | "demo",
  label?: string,
): AuditReport {
  return computeReport({
    id: `audit_new_${Date.now()}`,
    orgId: ORG_ID,
    createdAt: new Date().toISOString(),
    mode,
    answers,
    label,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation templates (5)
// ─────────────────────────────────────────────────────────────────────────────

export const RECOMMENDATIONS: RecommendationTemplate[] = [
  {
    id: "rec_quote_flow",
    categoryId: "sales",
    moduleId: "quoteflow",
    effort: "low",
    impact: "high",
    triggerRefs: ["sal_02", "sal_03", "sal_05"],
    title: {
      hy: "Միացնել QuoteFlow վերսիոնությամբ և e-sign-ով",
      ru: "Включить QuoteFlow с версионностью и e-sign",
      en: "Turn on QuoteFlow with versioning + e-sign",
    },
    rationale: {
      hy: "Ձեռքով PDF առաջարկները ստեղծում են սխալների և ուշացումների գոտի։ QuoteFlow-ն ապահովում է վերսիոնություն, price books և e-sign հոսք, որոնք կրճատում են պտույտի ժամանակը։",
      ru: "Ручные PDF-предложения создают зону ошибок и задержек. QuoteFlow даёт версионность, price books и e-sign поток, которые сокращают оборот.",
      en: "Manual PDF quotes create an error and delay zone. QuoteFlow provides versioning, price books and an e-sign flow that shortens turnaround.",
    },
  },
  {
    id: "rec_doc_ai",
    categoryId: "operations",
    moduleId: "documentflow",
    effort: "medium",
    impact: "high",
    triggerRefs: ["ops_01", "ops_02"],
    title: {
      hy: "Փաստաթղթերի մուտքը դեպի DocumentFlow AI",
      ru: "Ввод документов через DocumentFlow AI",
      en: "Move document intake to DocumentFlow AI",
    },
    rationale: {
      hy: "Ձեռքով մուտքագրումը կամ OCR-ով ստուգումը ժամանակատար է։ DocumentFlow AI-ն ավտոմատ դասակարգում և դաշտերի հանում է անում՝ exception-only ստուգմամբ։",
      ru: "Ручной ввод или OCR с проверкой трудозатратны. DocumentFlow AI выполняет авто-классификацию и extraction с проверкой только исключений.",
      en: "Manual entry or OCR-with-review is labor-intensive. DocumentFlow AI performs auto-classification and extraction with exception-only review.",
    },
  },
  {
    id: "rec_erp_link",
    categoryId: "data",
    moduleId: "erp",
    effort: "high",
    impact: "high",
    triggerRefs: ["dat_01", "ops_04", "ops_05"],
    title: {
      hy: "Միացնել պատվեր → ֆակտուրա → վճարում ERP Hub-ում",
      ru: "Связать заказ → счёт → платёж в ERP Hub",
      en: "Link order → invoice → payment in ERP Hub",
    },
    rationale: {
      hy: "Չմիացված համակարգերը բերում են կրկնօրինակների և հաշվեկշռի սխալների։ ERP Hub-ը միացնում է այս հոսքը մեկ տեղում։",
      ru: "Несвязанные системы порождают дубликаты и ошибки сверки. ERP Hub объединяет этот поток в одном месте.",
      en: "Disconnected systems breed duplicates and reconciliation errors. ERP Hub unifies this flow in one place.",
    },
  },
  {
    id: "rec_automation_governance",
    categoryId: "automation",
    moduleId: "automation",
    effort: "medium",
    impact: "high",
    triggerRefs: ["aut_01", "aut_02", "aut_05", "aut_06"],
    title: {
      hy: "Անցնել Autopilot շարժիչին + approval + observability",
      ru: "Перейти на движок Autopilot + approval + observability",
      en: "Move to the Autopilot engine + approval + observability",
    },
    rationale: {
      hy: "Point-tool ավտոմատացումները չունեն retries, dedup, հաստատումներ կամ պատմություն։ Autopilot-ն ապահովում է loop protection և հաստատման հոսքեր։",
      ru: "Point-tool автоматизации не имеют retries, dedup, approvals или истории. Autopilot даёт loop protection и approval-потоки.",
      en: "Point-tool automations lack retries, dedup, approvals or history. Autopilot provides loop protection and approval flows.",
    },
  },
  {
    id: "rec_ai_policy",
    categoryId: "ai_readiness",
    moduleId: "ownerAi",
    effort: "low",
    impact: "medium",
    triggerRefs: ["ai_01", "ai_02", "ai_05", "ai_06"],
    title: {
      hy: "Ընդունել AI օգտագործման քաղաքականություն + Owner AI հոսք",
      ru: "Принять политику AI + Owner AI поток",
      en: "Adopt an AI usage policy + Owner AI flow",
    },
    rationale: {
      hy: "Առանց քաղաքականության AI կիրառումը ռիսկային է (տվյալների արտահոսք) և անհետևանք։ Owner AI-ն ներկառուցում է հոսքերում human-in-the-loop-ով։",
      ru: "Без политики AI-использование рискованно (утечка данных) и нет прослеживаемости. Owner AI встраивается в потоки с human-in-the-loop.",
      en: "Without a policy, AI usage is risky (data leakage) and untraceable. Owner AI embeds into flows with human-in-the-loop.",
    },
  },
];

/**
 * Given a report's gap refs, return the prioritized recommendation templates
 * sorted by (impact × triggered count). Templates with no triggered refs are
 * still surfaced at the bottom, marked priority Infinity.
 */
export function prioritize(gaps: { ref: string }[]): PrioritizedRecommendation[] {
  const gapRefs = new Set(gaps.map((g) => g.ref));
  const out: PrioritizedRecommendation[] = [];
  for (const tpl of RECOMMENDATIONS) {
    const triggeredBy = tpl.triggerRefs.filter((r) => gapRefs.has(r));
    if (triggeredBy.length === 0) continue;
    const impactWeight = tpl.impact === "high" ? 3 : tpl.impact === "medium" ? 2 : 1;
    const priority = triggeredBy.length * impactWeight;
    out.push({ template: tpl, triggeredBy, priority });
  }
  out.sort((a, b) => b.priority - a.priority);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trends (for Control integration)
// ─────────────────────────────────────────────────────────────────────────────

/** Latest snapshot surfaced to the Control module via its ControlView. */
export function latestAuditSummary(): AuditRunSummary | null {
  const list = listRunSummaries();
  return list[0] ?? null;
}

/** All runs sorted oldest-first, suitable for a trend line. */
export function trendSeries(): AuditRunSummary[] {
  return [...HISTORY_RUNS].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  ).map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    mode: r.mode,
    questionnaireVersion: r.questionnaireVersion,
    scoreVersion: r.scoreVersion,
    overall: r.overall,
    categories: r.categories.reduce<Record<CategoryId, number>>((acc, cs) => {
      acc[cs.categoryId] = cs.score;
      return acc;
    }, {} as Record<CategoryId, number>),
    label: r.label,
  }));
}

// Re-export scoring helpers for convenience.
export { computeScores, SCORE_VERSION, QUESTIONNAIRE_VERSION };

// Helper for rendering — surfaces the full category list so views don't need
// to import from multiple files.
export { CATEGORY_LIST, QUESTION_BY_ID };
