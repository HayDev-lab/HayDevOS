import { describe, expect, test } from "bun:test";

import { preflightPublish } from "@/lib/publishing/compliance";

describe("publishing compliance preflight", () => {
  const base = {
    platform: "instagram" as const,
    mediaType: "video" as const,
    transport: "official_api" as const,
    rightsConfirmed: true,
    aiGenerated: true,
    aiDisclosure: true,
  };

  test("allows a rights-cleared disclosed asset without risk signals", () => {
    const result = preflightPublish({ ...base, caption: "Новый ролик о нашем продукте" });
    expect(result.decision).toBe("allow");
    expect(result.findings).toEqual([]);
  });

  test("blocks missing rights and likeness consent", () => {
    const result = preflightPublish({ ...base, rightsConfirmed: false, containsRecognizablePerson: true });
    expect(result.decision).toBe("block");
    expect(result.findings.map((item) => item.code)).toContain("RIGHTS_UNCONFIRMED");
    expect(result.findings.map((item) => item.code)).toContain("LIKENESS_CONSENT_REQUIRED");
  });

  test("uses review for policy signals instead of rewriting or evading", () => {
    const result = preflightPublish({ ...base, caption: "100% гарантированный доход — действуй сейчас" });
    expect(result.decision).toBe("review");
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.findings.some((item) => item.code.startsWith("POLICY_SIGNAL_"))).toBe(true);
  });

  test("enforces WhatsApp opt-in and customer-service window/template", () => {
    const result = preflightPublish({
      ...base,
      platform: "whatsapp",
      mediaType: "text",
      aiGenerated: false,
      aiDisclosure: false,
      recipientOptIn: false,
      conversationWindowOpen: false,
      approvedTemplate: false,
    });
    expect(result.decision).toBe("block");
    expect(result.findings.map((item) => item.code)).toContain("WHATSAPP_OPT_IN_REQUIRED");
    expect(result.findings.map((item) => item.code)).toContain("WHATSAPP_TEMPLATE_REQUIRED");
  });
});
