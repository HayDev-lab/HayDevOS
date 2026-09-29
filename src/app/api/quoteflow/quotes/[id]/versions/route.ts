import { NextResponse, type NextRequest } from "next/server";
import { withTenantApi } from "@/lib/api/handler";
import { toDomainContext } from "@/lib/quotes/context";
import { listQuoteVersions } from "@/lib/quotes/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest, route: { params: Promise<{ id: string }> }) { return withTenantApi(req, {}, async (auth) => NextResponse.json({ versions: await listQuoteVersions(toDomainContext(auth), (await route.params).id) })); }
