import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { getDb } from "@/lib/db";
import { TENANT_ROLES, type TenantRole } from "@/lib/auth/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listRoles = TENANT_ROLES.filter((role) => role !== "OWNER") as readonly TenantRole[];

const inviteSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    name: z.string().trim().min(1).max(120).optional(),
    role: z.enum(listRoles as [TenantRole, ...TenantRole[]]),
  })
  .strict();

// Invite = "provision a membership for an email". If the user does not exist
// yet, a passwordless placeholder account is created so the OWNER can onboard
// them; the invited user later sets a password through a separate flow. This
// keeps registration public-only-for-OWNER while still letting the OWNER add
// any role to the project.
export async function POST(req: NextRequest) {
  return withTenantApi(req, { mutation: true, roles: ["OWNER"] }, async (context) => {
    const body = await parseJson(req, inviteSchema, 8 * 1024);
    const db = getDb();

    // Find the user by email first; if they already belong to this org, abort
    // before creating a duplicate membership (the @@unique([userId, orgId])
    // constraint would throw otherwise).
    const existingUser = await db.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });
    if (existingUser) {
      const existingMembership = await db.membership.findUnique({
        where: { userId_orgId: { userId: existingUser.id, orgId: context.orgId } },
        select: { id: true },
      });
      if (existingMembership) {
        throw new ApiError(409, "MEMBER_EXISTS", "User is already a member of this organization");
      }
    }

    const user = await db.user.upsert({
      where: { email: body.email },
      update: {},
      create: {
        email: body.email,
        name: body.name ?? body.email.split("@")[0],
        locale: "hy",
      },
      select: { id: true, email: true, name: true },
    });

    const membership = await db.membership.create({
      data: {
        userId: user.id,
        orgId: context.orgId,
        role: body.role,
      },
    });

    await db.auditLog.create({
      data: {
        orgId: context.orgId,
        userId: context.userId,
        action: "team.member_added",
        entityType: "membership",
        entityId: membership.id,
        metadata: JSON.stringify({ targetUserId: user.id, targetEmail: user.email, role: body.role }),
      },
    });

    return NextResponse.json(
      {
        member: {
          id: membership.id,
          userId: user.id,
          email: user.email,
          name: user.name,
          role: membership.role,
          createdAt: membership.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  });
}

export async function GET(req: NextRequest) {
  return withTenantApi(req, { mutation: false, roles: ["OWNER", "ADMIN"] }, async (context) => {
    const db = getDb();
    const memberships = await db.membership.findMany({
      where: { orgId: context.orgId },
      include: { user: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      members: memberships.map((m) => ({
        id: m.id,
        userId: m.user.id,
        email: m.user.email,
        name: m.user.name ?? m.user.email,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  });
}