import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { clearSessionCookie } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withTenantApi(req, { mutation: true }, async (context) => {
    const db = getDb();
    await db.$transaction([
      db.auditLog.create({
        data: {
          orgId: context.orgId,
          userId: context.userId,
          action: "auth.logout",
          entityType: "session",
          entityId: context.sessionId,
        },
      }),
      db.session.delete({ where: { id: context.sessionId } }),
    ]);

    const response = new NextResponse(null, { status: 204 });
    clearSessionCookie(response);
    return response;
  });
}

