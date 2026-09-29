import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/leads/context";
import { changeLeadStageSchema, leadIdSchema } from "@/lib/leads/schemas";
import { changeLeadStage } from "@/lib/leads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, route: { params: Promise<{ id: string }> }) {
  return withTenantApi(req, { mutation: true }, async (auth) => {
    const { id } = await route.params;
    const input = await parseJson(req, changeLeadStageSchema, 8 * 1024);
    const lead = await changeLeadStage(toDomainContext(auth), leadIdSchema.parse(id), input);
    return NextResponse.json({ lead });
  });
}

