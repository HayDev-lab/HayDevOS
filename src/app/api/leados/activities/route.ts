import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { toDomainContext } from "@/lib/leads/context";
import { leadActivityListQuerySchema } from "@/lib/leads/schemas";
import { listLeadActivities } from "@/lib/leads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (auth) => {
    const query = leadActivityListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    return NextResponse.json(await listLeadActivities(toDomainContext(auth), query));
  });
}
