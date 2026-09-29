import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/leads/context";
import { leadIdSchema, updateLeadSchema } from "@/lib/leads/schemas";
import { archiveLead, getLead, updateLead } from "@/lib/leads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, route: Context) {
  return withTenantApi(req, {}, async (auth) => {
    const { id } = await route.params;
    const lead = await getLead(toDomainContext(auth), leadIdSchema.parse(id));
    return NextResponse.json({ lead });
  });
}

export async function PATCH(req: NextRequest, route: Context) {
  return withTenantApi(req, { mutation: true }, async (auth) => {
    const { id } = await route.params;
    const input = await parseJson(req, updateLeadSchema, 32 * 1024);
    const lead = await updateLead(toDomainContext(auth), leadIdSchema.parse(id), input);
    return NextResponse.json({ lead });
  });
}

export async function DELETE(req: NextRequest, route: Context) {
  return withTenantApi(req, { mutation: true }, async (auth) => {
    const { id } = await route.params;
    await archiveLead(toDomainContext(auth), leadIdSchema.parse(id));
    return new NextResponse(null, { status: 204 });
  });
}
