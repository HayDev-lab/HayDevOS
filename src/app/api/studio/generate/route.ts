import { NextResponse, type NextRequest } from "next/server";
import { withTenantApi } from "@/lib/api/handler";
import { generationSchema, generateStudioMedia, studioCapabilities } from "@/lib/studio/media-provider";
import { studioForm } from "@/lib/studio/upload";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async () => NextResponse.json(studioCapabilities()));
}
export async function POST(req: NextRequest) {
  return withTenantApi(req, { mutation: true, rateLimit: { scope: "studio-generate", limit: 8, windowMs: 600000 } }, async (context) => {
    const form = await studioForm(req);
    const input = generationSchema.parse({ kind: form.get("kind"), prompt: form.get("prompt"), aspectRatio: form.get("aspectRatio") ?? "16:9", durationSec: form.get("durationSec") ?? 5, voice: form.get("voice") ?? "coral" });
    const reference = form.get("reference");
    const media = await generateStudioMedia(context, input, reference instanceof File ? reference : undefined);
    return new NextResponse(media.bytes, { headers: { "Content-Type": media.mime, "Content-Disposition": 'attachment; filename="haydevos-generated"', "X-Studio-Kind": media.kind, "X-Content-Type-Options": "nosniff" } });
  });
}
