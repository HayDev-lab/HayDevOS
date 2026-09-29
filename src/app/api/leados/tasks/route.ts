import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { toDomainContext } from "@/lib/leads/context";
import { leadTaskListQuerySchema } from "@/lib/leads/schemas";
import { listLeadTasks } from "@/lib/leads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (auth) => {
    const query = leadTaskListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    return NextResponse.json(await listLeadTasks(toDomainContext(auth), query));
  });
}
