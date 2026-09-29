import { NextResponse, type NextRequest } from "next/server";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/quotes/context";
import { expectedRevisionSchema, updateQuoteSchema } from "@/lib/quotes/schemas";
import { archiveQuote, getQuote, updateQuote } from "@/lib/quotes/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, route: Context) {
  return withTenantApi(req, {}, async (auth) => NextResponse.json({ quote: await getQuote(toDomainContext(auth), (await route.params).id) }));
}

export async function PATCH(req: NextRequest, route: Context) {
  return withTenantApi(req, { mutation: true }, async (auth) => NextResponse.json({ quote: await updateQuote(toDomainContext(auth), (await route.params).id, await parseJson(req, updateQuoteSchema, 256 * 1024)) }));
}

export async function DELETE(req: NextRequest, route: Context) {
  return withTenantApi(req, { mutation: true }, async (auth) => {
    const input = await parseJson(req, expectedRevisionSchema);
    return NextResponse.json({ quote: await archiveQuote(toDomainContext(auth), (await route.params).id, input.expectedRevision) });
  });
}
