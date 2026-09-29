import { NextResponse, type NextRequest } from "next/server"; import { withTenantApi } from "@/lib/api/handler"; import { erpContext, listMovements, movementListSchema } from "@/lib/erp";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) { return withTenantApi(req, {}, async (auth) => NextResponse.json(await listMovements(erpContext(auth, req), movementListSchema.parse(Object.fromEntries(req.nextUrl.searchParams))))); }
