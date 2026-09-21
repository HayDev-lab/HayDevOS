/**
 * Owner AI — POST /api/owner-ai/reset
 *
 * Wipes the in-memory audit state (conversations, runs, tool calls, actions,
 * approvals, events). Used by the Settings → "Reset audit state" button.
 *
 * Returns 204 No Content on success.
 */

import { NextResponse } from "next/server";
import { resetAudit } from "../audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  resetAudit();
  return new NextResponse(null, { status: 204 });
}
