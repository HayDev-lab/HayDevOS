import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/leads/context";
import { assignLeadSchema, leadIdSchema } from "@/lib/leads/schemas";
import { assignLead } from "@/lib/leads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, route: { params: Promise<{ id: string }> }) {
  return withTenantApi(req, { mutation: true }, async (auth) => {
    const { id } = await route.params;
    const input = await parseJson(req, assignLeadSchema, 8 * 1024);
    const lead = await assignLead(toDomainContext(auth), leadIdSchema.parse(id), input.ownerId);
    return NextResponse.json({ lead });
  });
}

