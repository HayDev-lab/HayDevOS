import { NextResponse, type NextRequest } from "next/server";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { createCustomer, customerInputSchema, customerListSchema, erpContext, listCustomers } from "@/lib/erp";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) { return withTenantApi(req, {}, async (auth) => NextResponse.json(await listCustomers(erpContext(auth, req), customerListSchema.parse(Object.fromEntries(req.nextUrl.searchParams))))); }
export async function POST(req: NextRequest) { return withTenantApi(req, { mutation: true }, async (auth) => NextResponse.json({ customer: await createCustomer(erpContext(auth, req), await parseJson(req, customerInputSchema)) }, { status: 201 })); }
