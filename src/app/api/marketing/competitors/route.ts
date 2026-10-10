import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { COMPETITOR_SOURCE_TYPES, createCompetitorMonitor, deleteCompetitorMonitor, listCompetitorAnalyses, listCompetitorMonitors, updateCompetitorMonitor } from "@/lib/competitors/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sourceType = z.enum(COMPETITOR_SOURCE_TYPES);
const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().url().max(2048),
  sourceType: sourceType.optional().default("auto"),
  cadenceDays: z.number().int().min(1).max(30).optional().default(3),
}).strict();
const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  url: z.string().trim().url().max(2048).optional(),
  sourceType: sourceType.optional(),
  cadenceDays: z.number().int().min(1).max(30).optional(),
  enabled: z.boolean().optional(),
}).strict();

function validId(value: string | null): string {
  const id = value?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(id)) throw new ApiError(422, "COMPETITOR_ID_INVALID", "Competitor id is invalid");
  return id;
}

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (context) => {
    const analyses = req.nextUrl.searchParams.get("analyses") === "1";
    return NextResponse.json(analyses ? { analyses: await listCompetitorAnalyses(context) } : { monitors: await listCompetitorMonitors(context) });
  });
}

export async function POST(req: NextRequest) {
  return withTenantApi(req, {
    mutation: true,
    roles: ["OWNER", "ADMIN", "MANAGER"],
    rateLimit: { scope: "competitor-monitor-create", limit: 20, windowMs: 10 * 60_000 },
  }, async (context) => NextResponse.json(await createCompetitorMonitor(context, await parseJson(req, createSchema, 16 * 1024)), { status: 201 }));
}

export async function PATCH(req: NextRequest) {
  return withTenantApi(req, {
    mutation: true,
    roles: ["OWNER", "ADMIN", "MANAGER"],
    rateLimit: { scope: "competitor-monitor-update", limit: 60, windowMs: 60_000 },
  }, async (context) => NextResponse.json(await updateCompetitorMonitor(context, validId(req.nextUrl.searchParams.get("id")), await parseJson(req, updateSchema, 16 * 1024))));
}

export async function DELETE(req: NextRequest) {
  return withTenantApi(req, {
    mutation: true,
    roles: ["OWNER", "ADMIN", "MANAGER"],
    rateLimit: { scope: "competitor-monitor-delete", limit: 30, windowMs: 60_000 },
  }, async (context) => {
    await deleteCompetitorMonitor(context, validId(req.nextUrl.searchParams.get("id")));
    return NextResponse.json({ ok: true });
  });
}
