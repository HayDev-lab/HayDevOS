import { NextResponse, type NextRequest } from "next/server"; import { withTenantApi } from "@/lib/api/handler"; import { parseJson } from "@/lib/api/request";
import { createOrderFromAcceptedQuote, createOrderFromQuoteSchema, erpContext, listOrders, orderListSchema } from "@/lib/erp";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) { return withTenantApi(req, {}, async (auth) => NextResponse.json(await listOrders(erpContext(auth, req), orderListSchema.parse(Object.fromEntries(req.nextUrl.searchParams))))); }
export async function POST(req: NextRequest) { return withTenantApi(req, { mutation: true }, async (auth) => { const body = await parseJson(req, createOrderFromQuoteSchema); return NextResponse.json({ order: await createOrderFromAcceptedQuote(erpContext(auth, req), body.quoteId) }, { status: 201 }); }); }
