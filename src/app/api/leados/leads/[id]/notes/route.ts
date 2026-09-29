import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/leads/context";
import { createLeadNoteSchema, leadIdSchema } from "@/lib/leads/schemas";
import { addLeadNote } from "@/lib/leads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, route: { params: Promise<{ id: string }> }) {
  return withTenantApi(req, { mutation: true }, async (auth) => {
    const { id } = await route.params;
    const input = await parseJson(req, createLeadNoteSchema, 16 * 1024);
    const note = await addLeadNote(toDomainContext(auth), leadIdSchema.parse(id), input.body);
    return NextResponse.json({ note }, { status: 201 });
  });
}

