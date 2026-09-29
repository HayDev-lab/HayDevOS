import { NextResponse, type NextRequest } from "next/server";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/quotes/context";
import { decisionSchema } from "@/lib/quotes/schemas";
import { submitQuote } from "@/lib/quotes/service";
export const runtime = "nodejs";
export async function POST(req: NextRequest, route: { params: Promise<{ id: string }> }) { return withTenantApi(req, { mutation: true }, async (auth) => { const input = await parseJson(req, decisionSchema); return NextResponse.json({ quote: await submitQuote(toDomainContext(auth), (await route.params).id, input.expectedRevision, input.reason) }); }); }
