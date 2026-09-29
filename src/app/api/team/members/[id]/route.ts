import { NextResponse, type NextRequest } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { getDb } from "@/lib/db";
import { TENANT_ROLES, type TenantRole } from "@/lib/auth/types";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const changeableRoles = TENANT_ROLES.filter((role) => role !== "OWNER") as readonly TenantRole[];

const updateRoleSchema = z
  .object({
    role: z.enum(changeableRoles as [TenantRole, ...TenantRole[]]),
  })
  .strict();

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withTenantApi(req, { mutation: true, roles: ["OWNER"] }, async (context) => {
    const body = await parseJson(req, updateRoleSchema, 4 * 1024);
    const db = getDb();

    const membership = await db.membership.findUnique({
      where: { id },
      select: { id: true, userId: true, orgId: true, role: true },
    });

    if (!membership || membership.orgId !== context.orgId) {
      throw new ApiError(404, "MEMBER_NOT_FOUND", "Member not found in this organization");
    }
    if (membership.role === "OWNER") {
      throw new ApiError(409, "OWNER_ROLE_IMMUTABLE", "Cannot change the OWNER role");
    }
    if (membership.userId === context.userId) {
      throw new ApiError(409, "CANNOT_CHANGE_SELF", "You cannot change your own role");
    }

    const updated = await db.membership.update({
      where: { id },
      data: { role: body.role },
    });

    await db.auditLog.create({
      data: {
        orgId: context.orgId,
        userId: context.userId,
        action: "team.member_role_changed",
        entityType: "membership",
        entityId: membership.id,
        metadata: JSON.stringify({
          previousRole: membership.role,
          nextRole: body.role,
          targetUserId: membership.userId,
        }),
      },
    });

    return NextResponse.json({
      member: {
        id: updated.id,
        userId: membership.userId,
        role: updated.role,
      },
    });
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withTenantApi(req, { mutation: true, roles: ["OWNER"] }, async (context) => {
    const db = getDb();

    const membership = await db.membership.findUnique({
      where: { id },
      select: { id: true, userId: true, orgId: true, role: true },
    });

    if (!membership || membership.orgId !== context.orgId) {
      throw new ApiError(404, "MEMBER_NOT_FOUND", "Member not found in this organization");
    }
    if (membership.role === "OWNER") {
      throw new ApiError(409, "OWNER_CANNOT_BE_REMOVED", "The OWNER cannot be removed from their own organization");
    }
    if (membership.userId === context.userId) {
      throw new ApiError(409, "CANNOT_REMOVE_SELF", "You cannot remove yourself");
    }

    // Revoke any active sessions scoped to this organization so the removed
    // user loses access immediately, not when their cookie expires.
    await db.$transaction([
      db.session.deleteMany({
        where: { userId: membership.userId, orgId: context.orgId },
      }),
      db.membership.delete({ where: { id } }),
      db.auditLog.create({
        data: {
          orgId: context.orgId,
          userId: context.userId,
          action: "team.member_removed",
          entityType: "membership",
          entityId: membership.id,
          metadata: JSON.stringify({ targetUserId: membership.userId }),
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  });
}