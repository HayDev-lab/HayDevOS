import { NextResponse, type NextRequest } from "next/server"; import { withTenantApi } from "@/lib/api/handler"; import { erpContext, inventoryListSchema, listInventory } from "@/lib/erp";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) { return withTenantApi(req, {}, async (auth) => NextResponse.json(await listInventory(erpContext(auth, req), inventoryListSchema.parse(Object.fromEntries(req.nextUrl.searchParams))))); }
