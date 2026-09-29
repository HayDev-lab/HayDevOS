import { NextResponse, type NextRequest } from "next/server";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/quotes/context";
import { expectedRevisionSchema } from "@/lib/quotes/schemas";
import { sendQuote } from "@/lib/quotes/service";
export const runtime = "nodejs";
export async function POST(req: NextRequest, route: { params: Promise<{ id: string }> }) { return withTenantApi(req, { mutation: true }, async (auth) => { const input = await parseJson(req, expectedRevisionSchema); return NextResponse.json({ quote: await sendQuote(toDomainContext(auth), (await route.params).id, input.expectedRevision) }); }); }
