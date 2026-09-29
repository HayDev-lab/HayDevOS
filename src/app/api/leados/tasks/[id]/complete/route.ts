import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/leads/context";
import { completeTaskSchema, leadIdSchema } from "@/lib/leads/schemas";
import { completeLeadTask } from "@/lib/leads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, route: { params: Promise<{ id: string }> }) {
  return withTenantApi(req, { mutation: true }, async (auth) => {
    const { id } = await route.params;
    const input = await parseJson(req, completeTaskSchema, 8 * 1024);
    const task = await completeLeadTask(toDomainContext(auth), leadIdSchema.parse(id), input.completed);
    return NextResponse.json({ task });
  });
}

