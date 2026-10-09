import "server-only";

import type { AuthContext } from "@/lib/auth/session";
import { createOwnerAiCompletion, ownerAiProviderConfigured, ownerAiProviderName } from "@/lib/owner-ai/provider";
import { buildMagicPlan, mergeAiPlan, type MagicPlan, type MagicRequest } from "./magic";

export type MagicPlanResult = { plan: MagicPlan; providerReady: boolean; provider: string; providerError?: "OWNER_AI_PROVIDER_UNAVAILABLE" };

function aiPrompt(input: MagicRequest): string {
  return [
    "Create a production montage plan for HayDevOS Magic mode.",
    "Return JSON only: {\"summary\": string, \"steps\": [{\"action\": one of the requested action names, \"detail\": string}] }.",
    "Never invent file URLs, provider credentials, completed renders, or generated asset IDs.",
    "Keep uploaded assets and locked characters unchanged; choose generation steps only for missing assets.",
    JSON.stringify(input),
  ].join("\n");
}

export async function createMagicPlan(context: AuthContext, input: MagicRequest): Promise<MagicPlanResult> {
  const provider = ownerAiProviderName();
  const configured = ownerAiProviderConfigured();
  const basePlan = buildMagicPlan(input, false, configured ? provider : "local-plan");
  if (!configured) return { plan: basePlan, providerReady: false, provider: "local-plan" };

  const requestId = `magic_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  try {
    const completion = await createOwnerAiCompletion([
      { role: "system", content: "You are the HayDevOS Magic montage planner. Follow the JSON contract exactly." },
      { role: "user", content: aiPrompt(input) },
    ], {
      context: {
        tenantId: context.orgId,
        actorUserId: context.userId,
        actorRole: context.role,
        locale: "ru",
        conversationId: requestId,
        requestId,
        correlationId: requestId,
        actionIntent: "assist",
        riskClass: "approval-gated",
        originTrustLevel: "authenticated_owner_ai",
      },
    });
    const raw = completion.choices?.[0]?.message?.content;
    const plan = mergeAiPlan(basePlan, typeof raw === "string" ? raw : "", `${provider}${completion.model ? `:${completion.model}` : ""}`);
    return { plan, providerReady: true, provider: plan.provider };
  } catch {
    return { plan: basePlan, providerReady: false, provider, providerError: "OWNER_AI_PROVIDER_UNAVAILABLE" };
  }
}
