/**
 * Preflight policy gate for outbound social publishing.
 *
 * This module is deliberately a compliance check, not an evasion or
 * "uniqueizer" pipeline. It never rewrites media to hide its origin and it
 * does not expose a list of words that could be used to probe platform
 * filters. Signals only route content to review.
 */

export const PUBLISH_PLATFORMS = ["facebook", "instagram", "whatsapp"] as const;
export const PUBLISH_MEDIA_TYPES = ["text", "image", "video", "audio"] as const;
export const PUBLISH_TRANSPORTS = ["official_api", "manual_export", "unknown"] as const;

export type PublishPlatform = (typeof PUBLISH_PLATFORMS)[number];
export type PublishMediaType = (typeof PUBLISH_MEDIA_TYPES)[number];
export type PublishTransport = (typeof PUBLISH_TRANSPORTS)[number];
export type PreflightDecision = "allow" | "review" | "block";

export interface PublishPreflightInput {
  platform: PublishPlatform;
  mediaType: PublishMediaType;
  transport: PublishTransport;
  caption?: string;
  title?: string;
  aiGenerated?: boolean;
  aiDisclosure?: boolean;
  contentCredentialsPresent?: boolean;
  rightsConfirmed?: boolean;
  containsRecognizablePerson?: boolean;
  likenessConsentConfirmed?: boolean;
  recipientOptIn?: boolean;
  conversationWindowOpen?: boolean;
  approvedTemplate?: boolean;
  automated?: boolean;
  humanEscalationAvailable?: boolean;
}

export interface PreflightFinding {
  code: string;
  severity: "review" | "block";
  category: "rights" | "authenticity" | "messaging" | "spam" | "policy";
}

export interface PublishPreflightResult {
  decision: PreflightDecision;
  findings: PreflightFinding[];
  requiresHumanApproval: boolean;
  checkedAt: string;
}

type ReviewSignal = {
  category: string;
  pattern: RegExp;
};

// These are broad risk categories, not a platform "banned word" list. A
// match creates a human-review finding and is intentionally not returned with
// the matched text, so the gate cannot be used as a filter-probing oracle.
const REVIEW_SIGNALS: ReviewSignal[] = [
  { category: "financial_guarantee", pattern: /(100\s*%|guaranteed|без\s*риска|гарантированн(?:ый|ая|ое)|легкие?\s*деньги|easy\s*money)/iu },
  { category: "health_claim", pattern: /(cure|лечит|исцелит|гарантированно\s*похуде|без\s*врачей|miracle\s*cure)/iu },
  { category: "urgency_pressure", pattern: /(act\s*now|последний\s*шанс|только\s*сегодня|срочно|немедленно|limited\s*time)/iu },
  { category: "impersonation", pattern: /(official\s+support|служба\s+поддержки|официальный\s+аккаунт|meta\s+support|whatsapp\s+support)/iu },
  { category: "engagement_bait", pattern: /(share\s+this|like\s+and\s+share|поставь\s+лайк|поделись\s+со\s+всеми|отметь\s+10)/iu },
];

function addFinding(findings: PreflightFinding[], finding: PreflightFinding): void {
  if (!findings.some((item) => item.code === finding.code)) findings.push(finding);
}

export function preflightPublish(input: PublishPreflightInput, now = new Date()): PublishPreflightResult {
  const findings: PreflightFinding[] = [];
  const text = `${input.title ?? ""}\n${input.caption ?? ""}`.trim();

  if (input.transport !== "official_api") {
    addFinding(findings, { code: "OFFICIAL_API_REQUIRED", severity: "block", category: "policy" });
  }
  if (input.rightsConfirmed !== true) {
    addFinding(findings, { code: "RIGHTS_UNCONFIRMED", severity: "block", category: "rights" });
  }
  if (input.containsRecognizablePerson === true && input.likenessConsentConfirmed !== true) {
    addFinding(findings, { code: "LIKENESS_CONSENT_REQUIRED", severity: "block", category: "rights" });
  }

  if (input.aiGenerated === true && input.aiDisclosure !== true && input.contentCredentialsPresent !== true) {
    addFinding(findings, { code: "AI_DISCLOSURE_REVIEW", severity: "review", category: "authenticity" });
  }

  if (input.platform === "whatsapp") {
    if (input.recipientOptIn !== true) {
      addFinding(findings, { code: "WHATSAPP_OPT_IN_REQUIRED", severity: "block", category: "messaging" });
    }
    if (input.conversationWindowOpen !== true && input.approvedTemplate !== true) {
      addFinding(findings, { code: "WHATSAPP_TEMPLATE_REQUIRED", severity: "block", category: "messaging" });
    }
    if (input.automated === true && input.humanEscalationAvailable !== true) {
      addFinding(findings, { code: "WHATSAPP_ESCALATION_REQUIRED", severity: "review", category: "messaging" });
    }
  }

  if (text.length > 20_000) {
    addFinding(findings, { code: "TEXT_TOO_LONG_FOR_REVIEW", severity: "review", category: "spam" });
  }
  if ((text.match(/https?:\/\//giu) ?? []).length > 3) {
    addFinding(findings, { code: "MULTIPLE_EXTERNAL_LINKS", severity: "review", category: "spam" });
  }
  for (const signal of REVIEW_SIGNALS) {
    if (signal.pattern.test(text)) {
      addFinding(findings, { code: `POLICY_SIGNAL_${signal.category.toUpperCase()}`, severity: "review", category: "policy" });
    }
  }

  const decision: PreflightDecision = findings.some((item) => item.severity === "block")
    ? "block"
    : findings.length > 0
      ? "review"
      : "allow";

  return {
    decision,
    findings,
    requiresHumanApproval: decision !== "allow",
    checkedAt: now.toISOString(),
  };
}
