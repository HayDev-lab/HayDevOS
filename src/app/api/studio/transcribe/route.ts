import { NextResponse, type NextRequest } from "next/server";
import { withTenantApi } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { transcribeStudioMedia } from "@/lib/studio/media-provider";
import { studioForm } from "@/lib/studio/upload";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(req: NextRequest) {
  return withTenantApi(req, { mutation: true, rateLimit: { scope: "studio-transcribe", limit: 12, windowMs: 600000 } }, async () => {
    const form = await studioForm(req), file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(422, "STUDIO_FILE_INVALID", "A video or audio file is required");
    return NextResponse.json(await transcribeStudioMedia(file, String(form.get("language") ?? "auto")));
  });
}
