/**
 * HayDevOS Business Audit — deterministic scoring engine.
 *
 * Formula
 * =======
 *
 * For each `Question` and `Answer` pair, we compute a normalized 0..1
 * `contribution`:
 *
 *   - scale  : (value - 1) / 4        → maps 1..5 to 0..1
 *   - yesno  : option.value (yes|no)  → 1 or 0.15 etc.
 *   - single : option.value           → the selected option's value
 *   - multi  : sum(selectedOption.value) / sum(allOption.value), capped at 1
 *              (so selecting every "good" option still maxes at 1)
 *
 * The category score is the weight-weighted average of contributions, then
 * normalized to 0..100:
 *
 *   categoryScore = (Σ contribution_i * weight_i) / (Σ weight_i) * 100
 *
 * The overall score is the weighted average across the six categories, using
 * each category's own weight (sum of question weights inside the category),
 * i.e. categories with more weight carry more gravity:
 *
 *   overall = Σ (categoryScore * categoryWeight) / Σ categoryWeight
 *
 * A `Gap` is any answered question whose contribution < settings.gapThreshold
 * (default 0.5).
 *
 * Determinism
 * ===========
 * - Inputs are answers + questionnaire version.
 * - No LLM, no randomness, no Date.now() in the math.
 * - `scoreVersion` is derived from the questionnaire version + an algorithm
 *   hash. Changing the question set OR the algorithm bumps the version, so
 *   historical `AuditReport.scoreVersion` always reads back the algorithm that
 *   was used to produce it. The Owner AI may explain a historical score but
 *   cannot rewrite it.
 */

import {
  CATEGORY_LIST,
  DEFAULT_AUDIT_SETTINGS,
  type Answer,
  type AnswerMap,
  type AuditMode,
  type AuditReport,
  type AuditSettings,
  type AutomationOpportunity,
  type CategoryId,
  type CategoryScore,
  type Gap,
  type Impact,
  type Maturity,
  type Question,
  type RecommendedModule,
} from "./types";
import {
  QUESTIONNAIRE_VERSION,
  QUESTIONS,
  QUESTIONS_BY_CATEGORY,
  QUESTION_BY_ID,
} from "./questionnaire";

// ─────────────────────────────────────────────────────────────────────────────
// Algorithm version
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The algorithm version is intentionally hard-coded so that any change to the
 * scoring math requires a deliberate bump. The string has the form
 * "Q<questionnaireVersion>:S<algorithmVersion>".
 */
export const ALGORITHM_VERSION = "1.0.0";

/** Stable score version, derived deterministically from Q-version + algorithm. */
export const SCORE_VERSION = `Q${QUESTIONNAIRE_VERSION}:S${ALGORITHM_VERSION}`;

// ─────────────────────────────────────────────────────────────────────────────
// Contribution computation (pure)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the 0..1 contribution for one question/answer pair, or `null` if the
 * question wasn't answered.
 */
export function contributionFor(
  question: Question,
  answer: Answer | undefined,
): number | null {
  if (!answer) return null;

  switch (question.type) {
    case "scale": {
      if (typeof answer.value !== "number") return null;
      const v = answer.value;
      if (!Number.isFinite(v)) return null;
      // 1..5 → 0..1
      const clamped = Math.min(5, Math.max(1, v));
      return (clamped - 1) / 4;
    }
    case "yesno": {
      // value is either boolean or "yes"|"no" string
      let optionId: string;
      if (typeof answer.value === "boolean") {
        optionId = answer.value ? "yes" : "no";
      } else if (typeof answer.value === "string") {
        optionId = answer.value;
      } else {
        return null;
      }
      const opt = question.options.find((o) => o.id === optionId);
      return opt ? opt.value : null;
    }
    case "single": {
      if (typeof answer.value !== "string") return null;
      const opt = question.options.find((o) => o.id === answer.value);
      return opt ? opt.value : null;
    }
    case "multi": {
      if (!Array.isArray(answer.value)) return null;
      const selected = new Set(answer.value as string[]);
      if (selected.size === 0) return null;
      const totalValue = question.options.reduce((s, o) => s + o.value, 0);
      if (totalValue <= 0) return null;
      const earned = question.options
        .filter((o) => selected.has(o.id))
        .reduce((s, o) => s + o.value, 0);
      return Math.min(1, earned / totalValue);
    }
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Score computation (pure)
// ─────────────────────────────────────────────────────────────────────────────

/** Per-category weighted score (0..100), with raw/max contribution totals. */
export function categoryScore(
  categoryId: CategoryId,
  answers: AnswerMap,
): CategoryScore {
  const questions = QUESTIONS_BY_CATEGORY[categoryId];
  let raw = 0;
  let max = 0;
  let answered = 0;

  for (const q of questions) {
    const c = contributionFor(q, answers[q.id]);
    max += q.weight;
    if (c !== null) {
      raw += c * q.weight;
      answered += 1;
    }
  }

  const score = max > 0 ? Math.round((raw / max) * 100) : 0;
  return {
    categoryId,
    score,
    answered,
    total: questions.length,
    raw,
    max,
  };
}

/** Overall weighted score (0..100) across all categories. */
export function overallScore(categoryScores: CategoryScore[]): number {
  let raw = 0;
  let max = 0;
  for (const cs of categoryScores) {
    raw += cs.score * cs.max;
    max += cs.max;
  }
  return max > 0 ? Math.round(raw / max) : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gaps (pure)
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the per-question contribution for every answered question. */
export function allContributions(answers: AnswerMap): Array<{
  question: Question;
  answer: Answer;
  contribution: number;
}> {
  const out: Array<{ question: Question; answer: Answer; contribution: number }> = [];
  for (const q of QUESTIONS) {
    const a = answers[q.id];
    const c = contributionFor(q, a);
    if (c !== null) {
      out.push({ question: q, answer: a, contribution: c });
    }
  }
  return out;
}

/** Gaps: answered questions below the threshold. Impact inferred from depth. */
export function computeGaps(
  answers: AnswerMap,
  settings: AuditSettings = DEFAULT_AUDIT_SETTINGS,
): Gap[] {
  const gaps: Gap[] = [];
  for (const q of QUESTIONS) {
    const a = answers[q.id];
    const c = contributionFor(q, a);
    if (c === null) continue;
    if (c < settings.gapThreshold) {
      // Impact is a pure function of the contribution depth + question weight.
      // The lower the contribution and the higher the weight, the higher the impact.
      const severity = (settings.gapThreshold - c) * (q.weight >= 2 ? 1.5 : 1);
      const impact: Impact = severity >= 0.4 ? "high" : severity >= 0.2 ? "medium" : "low";
      gaps.push({
        questionId: q.id,
        ref: q.ref,
        categoryId: q.category,
        questionText: q.text,
        evidence: a.evidence,
        contribution: c,
        relatedModule: q.relatedModule,
        impact,
      });
    }
  }
  // Sort: high → medium → low, then deeper gap first.
  const order: Record<Impact, number> = { high: 0, medium: 1, low: 2 };
  gaps.sort((a, b) => {
    if (order[a.impact] !== order[b.impact]) return order[a.impact] - order[b.impact];
    return a.contribution - b.contribution;
  });
  return gaps;
}

// ─────────────────────────────────────────────────────────────────────────────
// Automation opportunities (pure, derived from answers)
// ─────────────────────────────────────────────────────────────────────────────

const PROCESS_BY_REF: Record<string, { process: string; relatedModule?: string }> = {
  acq_02: { process: "lead_capture", relatedModule: "integrations" },
  sal_07: { process: "sales_followups", relatedModule: "automation" },
  ops_01: { process: "document_intake", relatedModule: "documentflow" },
  ops_04: { process: "order_to_invoice", relatedModule: "erp" },
  ops_05: { process: "payment_tracking", relatedModule: "erp" },
  aut_04: { process: "automation_catalog", relatedModule: "automation" },
  ai_03: { process: "ai_use_cases", relatedModule: "ownerAi" },
};

/** Convert a 0..1 contribution to a maturity stage. */
function contributionToMaturity(c: number): Maturity {
  if (c >= 0.8) return "optimized";
  if (c >= 0.55) return "automated";
  if (c >= 0.25) return "assisted";
  return "manual";
}

const PROCESS_LABELS: Record<string, { hy: string; ru: string; en: string }> = {
  lead_capture: {
    hy: "Լիդի ձեռքբերում",
    ru: "Захват лидов",
    en: "Lead capture",
  },
  sales_followups: {
    hy: "Վաճառքի հետևողականություն",
    ru: "Follow-up в продажах",
    en: "Sales follow-ups",
  },
  document_intake: {
    hy: "Փաստաթղթերի մուտք",
    ru: "Приём документов",
    en: "Document intake",
  },
  order_to_invoice: {
    hy: "Պատվեր → ֆակտուրա",
    ru: "Заказ → счёт",
    en: "Order → invoice",
  },
  payment_tracking: {
    hy: "Վճարումների հետևում",
    ru: "Отслеживание платежей",
    en: "Payment tracking",
  },
  automation_catalog: {
    hy: "Ավտոմատացման կատալոգ",
    ru: "Каталог автоматизаций",
    en: "Automation catalog",
  },
  ai_use_cases: {
    hy: "AI օգտագործման դեպքեր",
    ru: "AI-сценарии",
    en: "AI use cases",
  },
};

const PROCESS_RATIONALE: Record<string, { hy: string; ru: string; en: string }> = {
  lead_capture: {
    hy: "Լիդի ձեռքբերումը միացված չէ CRM-ին կամ ձեռքով է տեղափոխվում։",
    ru: "Захват лидов не подключён к CRM или переносится вручную.",
    en: "Lead capture is not wired into the CRM or is moved by hand.",
  },
  sales_followups: {
    hy: "Վաճառքի հետևողականությունը հիմնականում ձեռքով է, բաց են հնարավոր հիշեցումները։",
    ru: "Follow-up в основном ручные, напоминания не настроены.",
    en: "Sales follow-ups are mostly manual; reminders are missing.",
  },
  document_intake: {
    hy: "Փաստաթղթերի մուտքագրումը ձեռքով է կամ չունի AI extraction։",
    ru: "Ввод документов ручной или без AI extraction.",
    en: "Document intake is manual or lacks AI extraction.",
  },
  order_to_invoice: {
    hy: "Պատվերից ֆակտուրա քայլը չի ավտոմատացված, ռիսկի գոտի՝ սխալներ և ուշացումներ։",
    ru: "Шаг заказа → счёт не автоматизирован, риск ошибок и задержек.",
    en: "Order → invoice step is not automated; risk of errors and delays.",
  },
  payment_tracking: {
    hy: "Վճարումների հետևումը կտրված է ֆակտուրաներից, ձեռքով հաշվեկշիռ։",
    ru: "Отслеживание платежей оторвано от счетов, сверка вручную.",
    en: "Payment tracking is detached from invoices; reconciliation is manual.",
  },
  automation_catalog: {
    hy: "Քիչ ակտիվ ավտոմատացումներ կամ բացակայում է կառավարումը։",
    ru: "Мало активных автоматизаций или нет управления.",
    en: "Few active automations or no governance in place.",
  },
  ai_use_cases: {
    hy: "AI օգտագործման դեպքերը սահմանափակ են կամ փորձնական։",
    ru: "AI-сценарии ограничены или пилотные.",
    en: "AI use-cases are limited or in pilot only.",
  },
};

/** Automation opportunities derived from a fixed set of process-anchored questions. */
export function computeOpportunities(answers: AnswerMap): AutomationOpportunity[] {
  const out: AutomationOpportunity[] = [];
  for (const [ref, meta] of Object.entries(PROCESS_BY_REF)) {
    const q = QUESTION_BY_ID[QUESTIONS.find((x) => x.ref === ref)?.id ?? ""];
    if (!q) continue;
    const a = answers[q.id];
    const c = contributionFor(q, a);
    if (c === null) continue;
    const current = contributionToMaturity(c);
    const target: Maturity = current === "optimized" ? "optimized" : current === "automated" ? "optimized" : current === "assisted" ? "automated" : "assisted";
    // Impact derived from delta between current and target + question weight.
    const maturityIndex: Record<Maturity, number> = { manual: 0, assisted: 1, automated: 2, optimized: 3 };
    const delta = maturityIndex[target] - maturityIndex[current];
    const impact: Impact = delta >= 2 ? "high" : delta === 1 ? "medium" : "low";
    out.push({
      id: `op_${ref}`,
      process: meta.process,
      processLabel: PROCESS_LABELS[meta.process],
      current,
      target,
      impact,
      rationale: PROCESS_RATIONALE[meta.process],
      relatedModule: meta.relatedModule,
    });
  }
  // Sort by impact (high → medium → low), then by maturity (manual first).
  const impactOrder: Record<Impact, number> = { high: 0, medium: 1, low: 2 };
  const maturityOrder: Record<Maturity, number> = { manual: 0, assisted: 1, automated: 2, optimized: 3 };
  out.sort((a, b) => {
    if (impactOrder[a.impact] !== impactOrder[b.impact]) return impactOrder[a.impact] - impactOrder[b.impact];
    return maturityOrder[a.current] - maturityOrder[b.current];
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommended modules (pure, derived from gaps)
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_LABEL_KEYS: Record<string, string> = {
  leados: "module.leados",
  quoteflow: "module.quoteflow",
  documentflow: "module.docsmart",
  erp: "module.erphub",
  automation: "module.autopilot",
  integrations: "module.connect",
  control: "module.control",
  ownerAi: "module.ownerAi",
};

export function auditModuleNameKey(moduleId: string): string {
  return MODULE_LABEL_KEYS[moduleId] ?? `module.${moduleId}`;
}

const MODULE_RATIONALE: Record<string, { hy: string; ru: string; en: string }> = {
  leados: {
    hy: "LeadOS-ը միացնում է աղբյուրները, ավտոմատացնում է բաշխումը և ապահովում է SLA։",
    ru: "LeadOS объединяет источники, автоматизирует маршрутизацию и даёт SLA.",
    en: "LeadOS unifies sources, automates routing and enforces SLAs.",
  },
  quoteflow: {
    hy: "QuoteFlow-ն ապահովում է վերսիոնություն, price books և e-sign հոսք։",
    ru: "QuoteFlow даёт версионность, price books и e-sign поток.",
    en: "QuoteFlow provides versioning, price books and an e-sign flow.",
  },
  documentflow: {
    hy: "DocumentFlow AI-ն ավտոմատացնում է դասակարգումը և extraction-ը։",
    ru: "DocumentFlow AI автоматизирует классификацию и extraction.",
    en: "DocumentFlow AI automates classification and extraction.",
  },
  erp: {
    hy: "ERP Hub-ը միացնում է պատվերները, ֆակտուրաները և վճարումները։",
    ru: "ERP Hub объединяет заказы, счета и платежи.",
    en: "ERP Hub unifies orders, invoices and payments.",
  },
  automation: {
    hy: "Autopilot-ն ապահովում է ավտոմատացման շարժիչ + հաստատումներ + observability։",
    ru: "Autopilot даёт движок автоматизаций + approvals + observability.",
    en: "Autopilot provides an automation engine + approvals + observability.",
  },
  integrations: {
    hy: "Integration Hub-ը միացնում է ալիքներն ու գործիքները մեկ տեղում։",
    ru: "Integration Hub подключает каналы и инструменты в одном месте.",
    en: "Integration Hub connects channels and tools in one place.",
  },
  control: {
    hy: "Control-ը տալիս է KPI, SLA և executive snapshot։",
    ru: "Control даёт KPI, SLA и executive snapshot.",
    en: "Control gives KPIs, SLAs and an executive snapshot.",
  },
  ownerAi: {
    hy: "Owner AI-ն ներկառուցում է AI օպերատորային հոսքերում human-in-the-loop-ով։",
    ru: "Owner AI встраивает AI в операционные потоки с human-in-the-loop.",
    en: "Owner AI embeds AI into operational flows with human-in-the-loop.",
  },
};

export function computeRecommendedModules(gaps: Gap[]): RecommendedModule[] {
  const byModule = new Map<string, number>();
  for (const g of gaps) {
    if (!g.relatedModule) continue;
    byModule.set(g.relatedModule, (byModule.get(g.relatedModule) ?? 0) + 1);
  }
  const out: RecommendedModule[] = [];
  for (const [moduleId, count] of byModule.entries()) {
    const rationale = MODULE_RATIONALE[moduleId];
    if (!rationale) continue;
    out.push({
      moduleId,
      nameKey: auditModuleNameKey(moduleId),
      rationale,
      impact: count >= 3 ? "high" : count === 2 ? "medium" : "low",
      evidenceCount: count,
    });
  }
  // Sort by evidence count desc.
  out.sort((a, b) => b.evidenceCount - a.evidenceCount);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level entry: computeScores (pure)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure, deterministic scoring. Same answers → same result, always.
 *
 * Inputs:
 *  - `answers`: the answer map keyed by question id
 *  - `questionnaireVersion`: must match `QUESTIONNAIRE_VERSION` for the
 *    current algorithm (older reports carry their own version)
 *
 * Output: a full `AuditReport` minus the runtime metadata (id, orgId,
 * createdAt, mode) — `data.ts` / the calling view stamps those on.
 */
export function computeScores(answers: AnswerMap): Omit<
  AuditReport,
  "id" | "orgId" | "createdAt" | "mode" | "label"
> {
  const categories = CATEGORY_LIST.map((c) => categoryScore(c.id, answers));
  const overall = overallScore(categories);
  const gaps = computeGaps(answers);
  const opportunities = computeOpportunities(answers);
  const recommendedModules = computeRecommendedModules(gaps);

  return {
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    scoreVersion: SCORE_VERSION,
    overall,
    categories,
    gaps,
    opportunities,
    recommendedModules,
    answers,
  };
}

/** Compute a report with runtime metadata stamped on. Pure given the metadata. */
export function computeReport(args: {
  id: string;
  orgId: string;
  createdAt: string;
  mode: AuditMode;
  answers: AnswerMap;
  label?: string;
}): AuditReport {
  const base = computeScores(args.answers);
  return {
    ...base,
    id: args.id,
    orgId: args.orgId,
    createdAt: args.createdAt,
    mode: args.mode,
    label: args.label,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-category progress (for the questionnaire sidebar)
// ─────────────────────────────────────────────────────────────────────────────

export function categoryProgress(categoryId: CategoryId, answers: AnswerMap): {
  answered: number;
  total: number;
  /** 0..1 fraction answered. */
  fraction: number;
} {
  const qs = QUESTIONS_BY_CATEGORY[categoryId];
  const answered = qs.filter((q) => answers[q.id] !== undefined).length;
  return {
    answered,
    total: qs.length,
    fraction: qs.length > 0 ? answered / qs.length : 0,
  };
}

export function totalProgress(answers: AnswerMap): {
  answered: number;
  total: number;
  fraction: number;
} {
  const answered = QUESTIONS.filter((q) => answers[q.id] !== undefined).length;
  return {
    answered,
    total: QUESTIONS.length,
    fraction: answered / QUESTIONS.length,
  };
}

// Re-export question helpers for convenience.
export { QUESTIONS, QUESTIONS_BY_CATEGORY, QUESTION_BY_ID, QUESTIONNAIRE_VERSION };
