import { NextResponse, type NextRequest } from "next/server"; import { withTenantApi } from "@/lib/api/handler"; import { parseJson } from "@/lib/api/request";
import { archiveProduct, erpContext, erpProductUpdateSchema, routeId, updateProduct } from "@/lib/erp";
export const runtime = "nodejs"; export const dynamic = "force-dynamic"; type Route = { params: Promise<{ id: string }> };
export async function PATCH(req: NextRequest, route: Route) { return withTenantApi(req, { mutation: true }, async (auth) => NextResponse.json({ product: await updateProduct(erpContext(auth, req), routeId((await route.params).id), await parseJson(req, erpProductUpdateSchema)) })); }
export async function DELETE(req: NextRequest, route: Route) { return withTenantApi(req, { mutation: true }, async (auth) => NextResponse.json(await archiveProduct(erpContext(auth, req), routeId((await route.params).id)))); }
