import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { proposeMontage } from "@/lib/studio/montage-service";
const schema = z.object({ prompt: z.string().trim().min(3).max(8000), duration: z.number().finite().min(0).max(86400), start: z.number().finite().min(0), end: z.number().finite().min(0), locale: z.enum(["ru", "hy", "en"]) }).strict();
export const maxDuration = 120;
export async function POST(req: NextRequest) {
  return withTenantApi(req, { mutation: true, rateLimit: { scope: "studio-montage", limit: 20, windowMs: 600000 } }, async (context) => {
    const input = await parseJson(req, schema);
    return NextResponse.json(await proposeMontage(context, input.prompt, input.duration, { start: input.start, end: input.end }, input.locale));
  });
}
