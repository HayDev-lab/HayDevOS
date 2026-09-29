import { NextResponse, type NextRequest } from "next/server";
import { withTenantApi } from "@/lib/api/handler";
import { toDomainContext } from "@/lib/quotes/context";
import { getQuoteOverview } from "@/lib/quotes/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (auth) => NextResponse.json(await getQuoteOverview(toDomainContext(auth))));
}
