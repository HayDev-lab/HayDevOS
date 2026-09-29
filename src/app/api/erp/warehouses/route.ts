import { NextResponse, type NextRequest } from "next/server"; import { withTenantApi } from "@/lib/api/handler"; import { parseJson } from "@/lib/api/request";
import { createWarehouse, erpContext, listWarehouses, warehouseInputSchema } from "@/lib/erp";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) { return withTenantApi(req, {}, async (auth) => NextResponse.json({ warehouses: await listWarehouses(erpContext(auth, req)) })); }
export async function POST(req: NextRequest) { return withTenantApi(req, { mutation: true }, async (auth) => NextResponse.json({ warehouse: await createWarehouse(erpContext(auth, req), await parseJson(req, warehouseInputSchema)) }, { status: 201 })); }
