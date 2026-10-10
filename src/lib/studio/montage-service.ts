import "server-only";
import { randomUUID } from "node:crypto";
import type { AuthContext } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/errors";
import { createOwnerAiCompletion, ownerAiProviderConfigured } from "@/lib/owner-ai/provider";
import { localMontage, validateMontagePatch, type MontageProposal } from "./montage";

export async function proposeMontage(context: AuthContext, prompt: string, duration: number, state: { start: number; end: number }, locale: "ru" | "hy" | "en"): Promise<MontageProposal> {
  if (ownerAiProviderConfigured()) {
    const requestId = "montage_" + randomUUID();
    try {
      const result = await createOwnerAiCompletion([
        { role: "system", content: 'Edit the current single-clip montage. Return JSON only: {"patch": {...}, "transcribe": boolean}. Allowed optional patch keys: aspectRatio (16:9, 9:16, 1:1), start/end (seconds within source duration), text/subtitle/brand, color (#RRGGBB), x/y (-50..50), scale (10..200), rotation (-180..180), opacity (0..100), filter (0 none, 1 grayscale, 2 sepia), brightness/contrast (50..150), saturation (0..180), blur (0..16), vignette (0..80), logoCorner (top-left, top-right, bottom-left, bottom-right), logoSize (5..40), logoOpacity (0..100). Change only what the user explicitly requests. transcribe=true only if speech transcription or timed captions were requested. Do not invent media, dialogue, cuts across multiple clips, file URLs or captions. Never exceed source duration. Do not output scripts or unsupported keys.' },
        { role: "user", content: JSON.stringify({ prompt, duration, currentClip: state }) },
      ], { context: { tenantId: context.orgId, actorUserId: context.userId, actorRole: context.role, locale, conversationId: requestId, requestId, correlationId: requestId, actionIntent: "assist", riskClass: "read", originTrustLevel: "authenticated_owner_ai" } });
      const raw = result.choices?.[0]?.message?.content;
      const data = JSON.parse(typeof raw === "string" ? raw.replace(/^\x60{3}(?:json)?\s*|\s*\x60{3}$/g, "").trim() : "") as { patch: unknown; transcribe?: boolean };
      const patch = validateMontagePatch(data.patch, duration, state.start, state.end);
      if (Object.keys(patch).length || data.transcribe === true) return { patch, transcribe: data.transcribe === true, source: "ai" };
    } catch { /* Explicit commands remain usable when the AI provider is unavailable. */ }
  }
  try {
    const local = localMontage(prompt, duration, state.start, state.end);
    if (Object.keys(local.patch).length || local.transcribe) return local;
  } catch { throw new ApiError(422, "STUDIO_TRIM_INVALID", "Trim must stay within the loaded media"); }
  throw new ApiError(422, "STUDIO_PROMPT_UNSUPPORTED", "No supported editing command was found");
}
