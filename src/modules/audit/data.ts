/**
 * Business Audit data helpers.
 *
 * Historical reports and preset answers are intentionally empty: reports must
 * come from the current organisation's persisted audit runs, never fixtures.
 */
import type {
  AnswerMap,
  AuditReport,
  AuditRunSummary,
  PrioritizedRecommendation,
  RecommendationTemplate,
} from "./types";
import { CATEGORY_LIST } from "./types";
import { QUESTION_BY_ID, QUESTIONNAIRE_VERSION } from "./questionnaire";
import { computeReport, computeScores, SCORE_VERSION } from "./scoring";

const ORG_ID = "org_haydev";

export const DEMO_ANSWERS: AnswerMap = {};
export const HISTORY_RUNS: AuditReport[] = [];
export const LATEST_RUN: AuditReport | null = null;

export function getRun(id: string): AuditReport | undefined {
  return HISTORY_RUNS.find((report) => report.id === id);
}

export function listRunSummaries(): AuditRunSummary[] {
  return [];
}

export function freshReport(
  answers: AnswerMap,
  mode: "current" | "demo",
  label?: string,
): AuditReport {
  return computeReport({
    id: `audit_${crypto.randomUUID()}`,
    orgId: ORG_ID,
    createdAt: new Date().toISOString(),
    mode,
    answers,
    label,
  });
}

/** Product rules, not tenant records. They are matched only against a real run. */
export const RECOMMENDATIONS: RecommendationTemplate[] = [
  {
    id: "rec_quote_flow",
    categoryId: "sales",
    moduleId: "quoteflow",
    effort: "low",
    impact: "high",
    triggerRefs: ["sal_02", "sal_03", "sal_05"],
    title: {
      hy: "Միացնել QuoteFlow-ը՝ տարբերակների և էլեկտրոնային ստորագրության համար",
      ru: "Включить QuoteFlow с версиями и электронной подписью",
      en: "Enable QuoteFlow with versioning and e-signatures",
    },
    rationale: {
      hy: "Ձեռքով պատրաստվող առաջարկները հաճախ ուշանում են կամ սխալներ են պարունակում։ QuoteFlow-ը պահպանում է տարբերակները և արագացնում հաստատումը։",
      ru: "Ручные предложения часто задерживаются или содержат ошибки. QuoteFlow хранит версии и ускоряет согласование.",
      en: "Manual quotes are error-prone and slow. QuoteFlow keeps versions and speeds up approval.",
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
      hy: "Փաստաթղթերը մշակել DocumentFlow AI-ով",
      ru: "Обрабатывать документы через DocumentFlow AI",
      en: "Process documents with DocumentFlow AI",
    },
    rationale: {
      hy: "DocumentFlow AI-ը դասակարգում է փաստաթղթերը, հանում տվյալները և մարդուն փոխանցում միայն ստուգման կարիք ունեցող դեպքերը։",
      ru: "DocumentFlow AI классифицирует документы, извлекает данные и передаёт человеку только спорные случаи.",
      en: "DocumentFlow AI classifies documents, extracts data, and sends only exceptions for review.",
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
      hy: "ERP Hub-ում կապել պատվերը, հաշիվը և վճարումը",
      ru: "Связать заказ, счёт и платёж в ERP Hub",
      en: "Link orders, invoices, and payments in ERP Hub",
    },
    rationale: {
      hy: "Միասնական հոսքը նվազեցնում է կրկնվող տվյալներն ու հաշվարկի սխալները։",
      ru: "Единый поток уменьшает дублирование данных и ошибки сверки.",
      en: "A unified flow reduces duplicate data and reconciliation errors.",
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
      hy: "Ավտոմատացումները տեղափոխել Autopilot",
      ru: "Перенести автоматизации в Autopilot",
      en: "Move automations to Autopilot",
    },
    rationale: {
      hy: "Autopilot-ը տալիս է կրկնման փորձեր, հաստատման քայլեր, կրկնօրինակների պաշտպանություն և ամբողջական պատմություն։",
      ru: "Autopilot добавляет повторные попытки, согласования, защиту от дублей и полную историю.",
      en: "Autopilot adds retries, approvals, deduplication, and a complete history.",
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
      hy: "Սահմանել AI-ի օգտագործման կանոններ",
      ru: "Утвердить правила использования ИИ",
      en: "Adopt AI usage rules",
    },
    rationale: {
      hy: "Հստակ կանոններն ու մարդու հաստատումը պաշտպանում են տվյալները և պատասխանատու են դարձնում AI-ի աշխատանքը։",
      ru: "Чёткие правила и подтверждение человеком защищают данные и делают работу ИИ контролируемой.",
      en: "Clear rules and human approval protect data and keep AI work accountable.",
    },
  },
];

export function prioritize(gaps: { ref: string }[]): PrioritizedRecommendation[] {
  const gapRefs = new Set(gaps.map((gap) => gap.ref));
  return RECOMMENDATIONS.map((template) => {
    const triggeredBy = template.triggerRefs.filter((ref) => gapRefs.has(ref));
    const impactWeight = template.impact === "high" ? 3 : template.impact === "medium" ? 2 : 1;
    return { template, triggeredBy, priority: triggeredBy.length * impactWeight };
  })
    .filter((item) => item.triggeredBy.length > 0)
    .sort((a, b) => b.priority - a.priority);
}

export function latestAuditSummary(): AuditRunSummary | null {
  return null;
}

export function trendSeries(): AuditRunSummary[] {
  return [];
}

export { computeScores, SCORE_VERSION, QUESTIONNAIRE_VERSION };
export { CATEGORY_LIST, QUESTION_BY_ID };
