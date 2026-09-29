import { NextResponse, type NextRequest } from "next/server"; import { withTenantApi } from "@/lib/api/handler"; import { parseJson } from "@/lib/api/request";
import { createProduct, erpContext, erpProductInputSchema, listProducts, productListSchema } from "@/lib/erp";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) { return withTenantApi(req, {}, async (auth) => NextResponse.json(await listProducts(erpContext(auth, req), productListSchema.parse(Object.fromEntries(req.nextUrl.searchParams))))); }
export async function POST(req: NextRequest) { return withTenantApi(req, { mutation: true }, async (auth) => NextResponse.json({ product: await createProduct(erpContext(auth, req), await parseJson(req, erpProductInputSchema)) }, { status: 201 })); }
