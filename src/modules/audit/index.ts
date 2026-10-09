/**
 * HayDevOS Business Audit module — public barrel.
 *
 * Default + named export: `BusinessAuditView`.
 *
 * Also re-exports the public type surface, the deterministic scoring engine
 * (`computeScores`, `computeReport`, `contributionFor`), the versioned
 * questionnaire (`QUESTIONS`, `QUESTIONNAIRE_VERSION`), the in-memory data
 * layer (`HISTORY_RUNS`, `DEMO_ANSWERS`, `RECOMMENDATIONS`), and the
 * `prioritize` helper for the Recommendations view.
 *
 * Owner AI and the Control module can import these to
 * explain a historical score or surface audit trends without re-running the
 * engine.
 */

export { BusinessAuditView, BusinessAuditView as default } from "./BusinessAuditView";

// Types
export type {
  Category,
  CategoryId,
  Question,
  QuestionOption,
  QuestionType,
  L10n,
  Answer,
  AnswerMap,
  CategoryScore,
  Gap,
  AutomationOpportunity,
  Maturity,
  RecommendedModule,
  AuditReport,
  AuditMode,
  AuditRunSummary,
  RecommendationTemplate,
  PrioritizedRecommendation,
  Impact,
  AuditSettings,
} from "./types";

export {
  CATEGORY_LIST,
  CATEGORY_BY_ID,
  MATURITY_ORDER,
  MATURITY_TONE,
  DEFAULT_AUDIT_SETTINGS,
  pickL10n,
  impactTone,
  scoreTone,
} from "./types";

// Questionnaire
export {
  QUESTIONNAIRE_VERSION,
  QUESTIONS,
  QUESTIONS_BY_CATEGORY,
  QUESTION_BY_ID,
  QUESTION_BY_REF,
  TOTAL_QUESTIONS,
} from "./questionnaire";

// Scoring (pure, deterministic)
export {
  ALGORITHM_VERSION,
  SCORE_VERSION,
  computeScores,
  computeReport,
  contributionFor,
  categoryScore,
  overallScore,
  computeGaps,
  computeOpportunities,
  computeRecommendedModules,
  allContributions,
  categoryProgress,
  totalProgress,
} from "./scoring";

// Data layer
export {
  HISTORY_RUNS,
  LATEST_RUN,
  DEMO_ANSWERS,
  RECOMMENDATIONS,
  getRun,
  listRunSummaries,
  freshReport,
  prioritize,
  latestAuditSummary,
  trendSeries,
} from "./data";
