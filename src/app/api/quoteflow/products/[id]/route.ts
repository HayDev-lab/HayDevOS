import { NextResponse, type NextRequest } from "next/server";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/quotes/context";
import { productUpdateSchema } from "@/lib/quotes/schemas";
import { archiveProduct, updateProduct } from "@/lib/quotes/service";
export const runtime = "nodejs";
export async function PATCH(req: NextRequest, route: { params: Promise<{ id: string }> }) { return withTenantApi(req, { mutation: true }, async (auth) => NextResponse.json({ product: await updateProduct(toDomainContext(auth), (await route.params).id, await parseJson(req, productUpdateSchema)) })); }
export async function DELETE(req: NextRequest, route: { params: Promise<{ id: string }> }) { return withTenantApi(req, { mutation: true }, async (auth) => NextResponse.json(await archiveProduct(toDomainContext(auth), (await route.params).id))); }
