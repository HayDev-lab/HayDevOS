import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/leads/context";
import { ingestLeadSchema } from "@/lib/leads/schemas";
import { ingestLead } from "@/lib/leads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This authenticated endpoint is the internal ingestion boundary. Public
// provider webhooks must verify their provider signature before calling the
// same domain service; Meta is intentionally not simulated in Gate #3.
export async function POST(req: NextRequest) {
  return withTenantApi(req, {
    mutation: true,
    rateLimit: { scope: "lead-ingest", limit: 120, windowMs: 60_000 },
  }, async (auth) => {
    const input = await parseJson(req, ingestLeadSchema, 128 * 1024);
    const result = await ingestLead(toDomainContext(auth), input);
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  });
}
