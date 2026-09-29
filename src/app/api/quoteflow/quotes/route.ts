import { NextResponse, type NextRequest } from "next/server";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/quotes/context";
import { createQuoteSchema, quoteListQuerySchema } from "@/lib/quotes/schemas";
import { createQuote, listQuotes } from "@/lib/quotes/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (auth) => NextResponse.json(await listQuotes(toDomainContext(auth), quoteListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams)))));
}

export async function POST(req: NextRequest) {
  return withTenantApi(req, { mutation: true }, async (auth) => NextResponse.json({ quote: await createQuote(toDomainContext(auth), await parseJson(req, createQuoteSchema, 256 * 1024)) }, { status: 201 }));
}
