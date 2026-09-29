import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toClientSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const switchOrganizationSchema = z.object({ orgId: z.string().min(1).max(64) }).strict();

export async function POST(req: NextRequest) {
  return withTenantApi(req, { mutation: true }, async (context) => {
    const { orgId } = await parseJson(req, switchOrganizationSchema, 4 * 1024);
    const organization = context.organizations.find((candidate) => candidate.id === orgId);
    if (!organization) {
      throw new ApiError(404, "ORGANIZATION_NOT_FOUND", "Organization not found");
    }

    const db = getDb();
    await db.$transaction([
      db.session.update({
        where: { id: context.sessionId },
        data: { orgId },
      }),
      db.auditLog.create({
        data: {
          orgId,
          userId: context.userId,
          action: "auth.organization_switched",
          entityType: "organization",
          entityId: orgId,
          metadata: JSON.stringify({ previousOrgId: context.orgId }),
        },
      }),
    ]);

    return NextResponse.json({
      session: toClientSession({
        ...context,
        orgId,
        role: organization.role,
      }),
    });
  });
}

