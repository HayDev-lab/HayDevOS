import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { toDomainContext } from "@/lib/leads/context";
import { getLeadOverview } from "@/lib/leads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (auth) => {
    const overview = await getLeadOverview(toDomainContext(auth));
    return NextResponse.json({ overview });
  });
}

