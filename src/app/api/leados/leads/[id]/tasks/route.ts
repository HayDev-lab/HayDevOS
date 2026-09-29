import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/leads/context";
import { createLeadTaskSchema, leadIdSchema } from "@/lib/leads/schemas";
import { createLeadTask } from "@/lib/leads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, route: { params: Promise<{ id: string }> }) {
  return withTenantApi(req, { mutation: true }, async (auth) => {
    const { id } = await route.params;
    const input = await parseJson(req, createLeadTaskSchema, 24 * 1024);
    const task = await createLeadTask(toDomainContext(auth), leadIdSchema.parse(id), input);
    return NextResponse.json({ task }, { status: 201 });
  });
}

