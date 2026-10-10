import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { scanAuditSources } from "@/lib/business-audit/sources";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  sources: z.array(z.object({
    url: z.string().trim().min(1).max(2048),
    kind: z.enum(["website", "social"]),
  }).strict()).min(1).max(6),
}).strict();

export async function POST(req: NextRequest) {
  return withTenantApi(req, {
    mutation: true,
    rateLimit: { scope: "audit:sources", limit: 10, windowMs: 10 * 60_000 },
  }, async () => {
    const input = await parseJson(req, schema, 16 * 1024);
    return NextResponse.json({ sources: await scanAuditSources(input.sources) });
  });
}
