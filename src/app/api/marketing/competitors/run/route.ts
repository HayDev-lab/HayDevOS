import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { runCompetitorMonitoring } from "@/lib/competitors/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const runSchema = z.object({ monitorId: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/).optional(), force: z.boolean().optional().default(true) }).strict();

export async function POST(req: NextRequest) {
  return withTenantApi(req, {
    mutation: true,
    roles: ["OWNER", "ADMIN", "MANAGER"],
    rateLimit: { scope: "competitor-monitor-run", limit: 6, windowMs: 10 * 60_000 },
  }, async (context) => {
    const input = await parseJson(req, runSchema, 8 * 1024);
    return NextResponse.json(await runCompetitorMonitoring(context.orgId, input));
  });
}
