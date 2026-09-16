import {
  auditDomains,
  auditQuestions,
  type AuditComplexity,
  type AuditDomain,
  type AuditImpact,
  type AuditQuestion,
  type AuditState,
} from "@/data/business-audit";

export const AUDIT_DRAFT_VERSION = 1 as const;
export const AUDIT_STORAGE_KEY = "haydev.business-audit.v1";

export type AuditAudience = "internal" | "public";
export type AuditProfile = "current" | "demo";
export type AuditAnswers = Record<string, string>;

export type AuditDraft = {
  version: typeof AUDIT_DRAFT_VERSION;
  audience: AuditAudience;
  profile: AuditProfile;
  answers: AuditAnswers;
  currentStep: number;
  updatedAt: string;
};

export type AuditPriority = {
  question: AuditQuestion;
  impact: AuditImpact;
  complexity: AuditComplexity;
  severity: number;
};

export type AuditReport = {
  completed: boolean;
  answeredCount: number;
  overallScore: number;
  domainScores: Record<AuditDomain, number>;
  map: Array<{ question: AuditQuestion; state: AuditState | null; score: number | null }>;
  priorities: AuditPriority[];
};

const impactWeight: Record<AuditImpact, number> = { high: 3, medium: 2 };
const complexityWeight: Record<AuditComplexity, number> = { low: 1, medium: 2, high: 3 };

export function getChoice(question: AuditQuestion, answerId?: string) {
  return question.choices.find((item) => item.id === answerId);
}

export function createAuditReport(answers: AuditAnswers): AuditReport {
  const selected = auditQuestions.map((question) => ({
    question,
    choice: getChoice(question, answers[question.id]),
  }));
  const answeredCount = selected.filter((item) => item.choice).length;
  const domainScores = Object.fromEntries(
    auditDomains.map((domain) => {
      const relevant = selected.filter((item) => item.choice && item.question.domains.includes(domain));
      const average = relevant.length
        ? relevant.reduce((sum, item) => sum + (item.choice?.score ?? 0), 0) / relevant.length
        : 0;
      return [domain, Math.round((average / 3) * 100)];
    }),
  ) as Record<AuditDomain, number>;
  const allScores = Object.values(domainScores);
  const overallScore = Math.round(allScores.reduce((sum, value) => sum + value, 0) / allScores.length);
  const ranked = selected
    .filter((item): item is { question: AuditQuestion; choice: NonNullable<typeof item.choice> } => Boolean(item.choice))
    .map(({ question, choice }) => ({
      question,
      impact: question.recommendation.impact,
      complexity: question.recommendation.complexity,
      score: choice.score,
      severity: (3 - choice.score) * 10 + impactWeight[question.recommendation.impact] * 3 - complexityWeight[question.recommendation.complexity],
    }))
    .sort((a, b) => b.severity - a.severity);
  const needsWork = ranked.filter((item) => item.score < 3);
  const priorities = [...needsWork, ...ranked.filter((item) => item.score === 3)]
    .slice(0, Math.min(5, Math.max(3, needsWork.length)))
    .map(({ question, impact, complexity, severity }) => ({ question, impact, complexity, severity }));

  return {
    completed: answeredCount === auditQuestions.length,
    answeredCount,
    overallScore,
    domainScores,
    map: selected.map(({ question, choice }) => ({ question, state: choice?.state ?? null, score: choice?.score ?? null })),
    priorities,
  };
}

export function buildIntegrationPayload(draft: AuditDraft) {
  const report = createAuditReport(draft.answers);
  return {
    schema: "haydev.business-audit/1",
    generatedAt: new Date().toISOString(),
    context: { audience: draft.audience, profile: draft.profile },
    answers: auditQuestions.map((question) => ({
      questionId: question.id,
      choiceId: draft.answers[question.id] ?? null,
    })),
    scores: report.domainScores,
    automationMap: report.map.map((item) => ({ processId: item.question.id, state: item.state })),
    priorities: report.priorities.map((item) => ({
      processId: item.question.id,
      impact: item.impact,
      complexity: item.complexity,
      connectsTo: item.question.recommendation.connectsTo,
    })),
  };
}

export function parseAuditDraft(value: string | null): AuditDraft | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<AuditDraft>;
    if (parsed.version !== AUDIT_DRAFT_VERSION || !parsed.answers || typeof parsed.currentStep !== "number") return null;
    return {
      version: AUDIT_DRAFT_VERSION,
      audience: parsed.audience === "public" ? "public" : "internal",
      profile: parsed.profile === "demo" ? "demo" : "current",
      answers: parsed.answers,
      currentStep: Math.max(0, Math.min(auditQuestions.length - 1, parsed.currentStep)),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
