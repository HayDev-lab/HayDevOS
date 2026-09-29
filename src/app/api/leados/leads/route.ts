import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/leads/context";
import { createLeadSchema, leadListQuerySchema } from "@/lib/leads/schemas";
import { createLead, listLeadRecords } from "@/lib/leads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (auth) => {
    const query = leadListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const result = await listLeadRecords(toDomainContext(auth), query);
    return NextResponse.json(result);
  });
}

export async function POST(req: NextRequest) {
  return withTenantApi(req, { mutation: true }, async (auth) => {
    const input = await parseJson(req, createLeadSchema, 32 * 1024);
    const lead = await createLead(toDomainContext(auth), input);
    return NextResponse.json({ lead }, { status: 201 });
  });
}

