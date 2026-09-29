import { NextResponse, type NextRequest } from "next/server";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/quotes/context";
import { productInputSchema } from "@/lib/quotes/schemas";
import { createProduct, listProducts } from "@/lib/quotes/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) { return withTenantApi(req, {}, async (auth) => NextResponse.json({ products: await listProducts(toDomainContext(auth)) })); }
export async function POST(req: NextRequest) { return withTenantApi(req, { mutation: true }, async (auth) => NextResponse.json({ product: await createProduct(toDomainContext(auth), await parseJson(req, productInputSchema)) }, { status: 201 })); }
