import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { resetAudit, withPersistentAuditStore } from "../audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withTenantApi(
    req,
    { mutation: true, roles: ["OWNER", "ADMIN"] },
    async (context) =>
      withPersistentAuditStore(
        { orgId: context.orgId, userId: context.userId, scope: "tenant" },
        async () => {
          resetAudit();
          return new NextResponse(null, { status: 204 });
        },
      ),
  );
}
