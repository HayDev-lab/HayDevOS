import { NextResponse, type NextRequest } from "next/server"; import { withTenantApi } from "@/lib/api/handler"; import { erpContext, getOrder, routeId } from "@/lib/erp";
export const runtime = "nodejs"; export const dynamic = "force-dynamic"; type Route = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, route: Route) { return withTenantApi(req, {}, async (auth) => NextResponse.json({ order: await getOrder(erpContext(auth, req), routeId((await route.params).id)) })); }
