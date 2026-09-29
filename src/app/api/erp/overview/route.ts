import { NextResponse, type NextRequest } from "next/server"; import { withTenantApi } from "@/lib/api/handler"; import { erpContext, getErpOverview } from "@/lib/erp";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) { return withTenantApi(req, {}, async (auth) => NextResponse.json(await getErpOverview(erpContext(auth, req)))); }
