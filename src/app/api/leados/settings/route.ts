import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/leads/context";
import { slaPolicySchema } from "@/lib/leads/schemas";
import { getLeadOverview, updateSlaPolicy } from "@/lib/leads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (auth) => {
    const overview = await getLeadOverview(toDomainContext(auth));
    return NextResponse.json({ pipelines: overview.pipelines, slaPolicy: overview.slaPolicy });
  });
}

export async function PATCH(req: NextRequest) {
  return withTenantApi(req, { mutation: true }, async (auth) => {
    const input = await parseJson(req, slaPolicySchema, 8 * 1024);
    const slaPolicy = await updateSlaPolicy(toDomainContext(auth), input);
    return NextResponse.json({ slaPolicy });
  });
}

