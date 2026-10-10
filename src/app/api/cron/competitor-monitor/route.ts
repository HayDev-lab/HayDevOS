import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { runCompetitorMonitoringForDueOrganizations } from "@/lib/competitors/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function validCronSecret(req: NextRequest): boolean {
  const configured = process.env.CRON_SECRET?.trim() || process.env.HAYDEV_CRON_SECRET?.trim();
  if (!configured || configured.length < 24) return false;
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const expected = Buffer.from(configured, "utf8");
  const actual = Buffer.from(supplied, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(req: NextRequest) {
  if (!validCronSecret(req)) return NextResponse.json({ error: "CRON_UNAUTHORIZED" }, { status: 401 });
  const result = await runCompetitorMonitoringForDueOrganizations();
  return NextResponse.json({ ok: true, ...result });
}
