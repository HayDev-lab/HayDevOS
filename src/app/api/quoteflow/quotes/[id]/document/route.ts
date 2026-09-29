import { NextResponse, type NextRequest } from "next/server";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/quotes/context";
import { documentSchema } from "@/lib/quotes/schemas";
import { generateQuoteDocument } from "@/lib/quotes/service";
export const runtime = "nodejs";
export async function POST(req: NextRequest, route: { params: Promise<{ id: string }> }) { return withTenantApi(req, { mutation: true, rateLimit: { scope: "quote-document", limit: 30, windowMs: 10 * 60_000 } }, async (auth) => { const input = await parseJson(req, documentSchema); return NextResponse.json({ document: await generateQuoteDocument(toDomainContext(auth), (await route.params).id, input.versionId, input.format, input.locale) }, { status: 201 }); }); }
