import { NextResponse, type NextRequest } from "next/server"; import { withTenantApi } from "@/lib/api/handler"; import { parseJson } from "@/lib/api/request"; import { adjustInventory, adjustInventorySchema, erpContext } from "@/lib/erp";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) { return withTenantApi(req, { mutation: true }, async (auth) => NextResponse.json({ movement: await adjustInventory(erpContext(auth, req), await parseJson(req, adjustInventorySchema)) }, { status: 201 })); }
