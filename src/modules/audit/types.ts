/**
 * HayDevOS Business Audit — typed domain model.
 *
 * A deterministic, multilingual readiness assessment of the business across
 * six categories: Acquisition, Sales, Operations, Data, Automation, AI Readiness.
 *
 * The score is immutable once computed. Owner AI may explain a
 * historical score but cannot alter it — see `scoreVersion` in `scoring.ts`.
 */

import type { Locale } from "@/lib/i18n";
import type { AuditBusinessContext } from "@/lib/business-audit/context";

// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────

export type CategoryId =
  | "acquisition"
  | "sales"
  | "operations"
  | "data"
  | "automation"
  | "ai_readiness";

export interface Category {
  id: CategoryId;
  /** i18n key, e.g. "audit.category.acquisition" */
  nameKey: string;
  /** Short description i18n key */
  descKey: string;
  /** Accent token used for charts/badges. */
  accent: "lime" | "cyan" | "amber" | "rose" | "violet";
}

// ─────────────────────────────────────────────────────────────────────────────
// Question types
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionType =
  | "scale" // 1-5 slider
  | "yesno" // boolean toggle
  | "single" // single-select (radio)
  | "multi"; // multi-select (chips)

/** Localized string — at minimum HY/RU/EN. */
export interface L10n {
  hy: string;
  ru: string;
  en: string;
}

export interface QuestionOption {
  id: string;
  label: L10n;
  /** Normalized 0..1 contribution when this option is selected. */
  value: number;
}

export interface Question {
  id: string;
  category: CategoryId;
  /** Stable identifier used by scoring (e.g. "acq_01"). */
  ref: string;
  type: QuestionType;
  text: L10n;
  /** Prompt shown alongside the evidence/notes field. */
  evidencePrompt: L10n;
  /** Per-question weight (1..N). Default 1. */
  weight: number;
  /** Options for `single` / `multi` / `yesno` questions. Empty for `scale`. */
  options: QuestionOption[];
  /** For `scale` questions: optional labels for the 1..5 anchors. */
  scaleLabels?: { low: L10n; high: L10n };
  /** Optional hint shown under the question. */
  hint?: L10n;
  /** Optional id of a recommended HayDev module surfaced when this is a gap. */
  relatedModule?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Answers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Answer value is normalized depending on `question.type`:
 *  - scale: number 1..5
 *  - yesno: boolean
 *  - single: option id (string)
 *  - multi: array of option ids
 */
export interface Answer {
  questionId: string;
  value: number | boolean | string | string[];
  /** Free-text evidence / notes the operator attached. */
  evidence?: string;
}

export type AnswerMap = Record<string, Answer>;

// ─────────────────────────────────────────────────────────────────────────────
// Scoring outputs
// ─────────────────────────────────────────────────────────────────────────────

export type Impact = "high" | "medium" | "low";

export interface CategoryScore {
  categoryId: CategoryId;
  /** 0..100 */
  score: number;
  /** Number of questions answered in this category. */
  answered: number;
  /** Total questions in this category. */
  total: number;
  /** Weighted score breakdown (raw contribution sum / max contribution sum). */
  raw: number;
  max: number;
}

export interface Gap {
  questionId: string;
  ref: string;
  categoryId: CategoryId;
  questionText: L10n;
  evidence?: string;
  /** 0..1 normalized answer contribution. */
  contribution: number;
  /** Recommended module surfaced from the question. */
  relatedModule?: string;
  /** Qualitative impact estimate. */
  impact: Impact;
}

export interface AutomationOpportunity {
  id: string;
  /** Process area in english (used as a stable identifier). */
  process: string;
  processLabel: L10n;
  /** Current maturity derived from answers: manual / assisted / automated / optimized. */
  current: Maturity;
  target: Maturity;
  impact: Impact;
  rationale: L10n;
  relatedModule?: string;
}

export type Maturity = "manual" | "assisted" | "automated" | "optimized";

export interface RecommendedModule {
  moduleId: string;
  /** i18n key resolved at render time (e.g. "module.leados"). */
  nameKey: string;
  rationale: L10n;
  impact: Impact;
  /** Number of gap questions tied to this module. */
  evidenceCount: number;
}

export interface AuditReport {
  businessContext?: AuditBusinessContext;
  /** Stable run id (org-scoped). */
  id: string;
  orgId: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Mode the audit was completed in. */
  mode: AuditMode;
  /** The questionnaire version this report was generated from. */
  questionnaireVersion: string;
  /** Deterministic algorithm version. */
  scoreVersion: string;
  overall: number;
  categories: CategoryScore[];
  gaps: Gap[];
  opportunities: AutomationOpportunity[];
  recommendedModules: RecommendedModule[];
  answers: AnswerMap;
  /** Optional label, e.g. "Q3 baseline". */
  label?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Run + mode
// ─────────────────────────────────────────────────────────────────────────────

export type AuditMode = "current" | "demo";

export interface AuditRunSummary {
  id: string;
  createdAt: string;
  mode: AuditMode;
  questionnaireVersion: string;
  scoreVersion: string;
  overall: number;
  /** categoryId → score */
  categories: Record<CategoryId, number>;
  label?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendations catalog (template recommendations, not user-specific)
// ─────────────────────────────────────────────────────────────────────────────

export interface RecommendationTemplate {
  id: string;
  /** Category the recommendation applies to (or `null` for cross-cutting). */
  categoryId: CategoryId | null;
  title: L10n;
  /** Rationale, optionally with `{ref}` placeholders tied to specific questions. */
  rationale: L10n;
  /** Recommended HayDev module id. */
  moduleId: string;
  /** Qualitative effort estimate. */
  effort: "low" | "medium" | "high";
  impact: Impact;
  /** Question refs that activate this recommendation (any answered below threshold). */
  triggerRefs: string[];
}

export interface PrioritizedRecommendation {
  template: RecommendationTemplate;
  /** Question refs that actually triggered this rec in the current report. */
  triggeredBy: string[];
  priority: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditSettings {
  /** Threshold below which a question's contribution counts as a gap (0..1). */
  gapThreshold: number;
  /** Score >= good (lime). */
  goodThreshold: number;
  /** Score >= needs-work (amber). Below this is weak (rose). */
  needsWorkThreshold: number;
}

export const DEFAULT_AUDIT_SETTINGS: AuditSettings = {
  gapThreshold: 0.5,
  goodThreshold: 70,
  needsWorkThreshold: 50,
};

// ─────────────────────────────────────────────────────────────────────────────
// Locale-aware helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Pick the localized string for a given locale. */
export function pickL10n(l10n: L10n, locale: Locale): string {
  return l10n[locale] ?? l10n.en;
}

export const CATEGORY_LIST: Category[] = [
  {
    id: "acquisition",
    nameKey: "audit.category.acquisition",
    descKey: "audit.category.acquisition.desc",
    accent: "lime",
  },
  {
    id: "sales",
    nameKey: "audit.category.sales",
    descKey: "audit.category.sales.desc",
    accent: "cyan",
  },
  {
    id: "operations",
    nameKey: "audit.category.operations",
    descKey: "audit.category.operations.desc",
    accent: "amber",
  },
  {
    id: "data",
    nameKey: "audit.category.data",
    descKey: "audit.category.data.desc",
    accent: "violet",
  },
  {
    id: "automation",
    nameKey: "audit.category.automation",
    descKey: "audit.category.automation.desc",
    accent: "rose",
  },
  {
    id: "ai_readiness",
    nameKey: "audit.category.ai_readiness",
    descKey: "audit.category.ai_readiness.desc",
    accent: "lime",
  },
];

export const CATEGORY_BY_ID: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORY_LIST.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

export const MATURITY_ORDER: Maturity[] = ["manual", "assisted", "automated", "optimized"];

export const MATURITY_TONE: Record<Maturity, "rose" | "amber" | "cyan" | "lime"> = {
  manual: "rose",
  assisted: "amber",
  automated: "cyan",
  optimized: "lime",
};

/** Tone for an impact value (high=rose for visibility, medium=amber, low=cyan). */
export function impactTone(impact: Impact): "rose" | "amber" | "cyan" {
  if (impact === "high") return "rose";
  if (impact === "medium") return "amber";
  return "cyan";
}

/** Tone for a score band. */
export function scoreTone(
  score: number,
  settings: AuditSettings = DEFAULT_AUDIT_SETTINGS,
): "lime" | "amber" | "rose" {
  if (score >= settings.goodThreshold) return "lime";
  if (score >= settings.needsWorkThreshold) return "amber";
  return "rose";
}
