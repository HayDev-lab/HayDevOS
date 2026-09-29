import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { apiErrorResponse, ApiError } from "@/lib/api/errors";
import { assertSameOrigin, parseJson } from "@/lib/api/request";
import {
  createDatabaseSession,
  resolveSessionToken,
  setSessionCookie,
  toClientSession,
} from "@/lib/auth/session";
import { burnPasswordCheck, verifyPassword } from "@/lib/auth/password";
import {
  clearLoginAttempts,
  loginClientAddress,
  reserveLoginAttempts,
} from "@/lib/auth/login-throttle";
import { getDb } from "@/lib/db";
import { logEvent, reportServerError, requestIdFrom } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict();

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = requestIdFrom(req);
  try {
    assertSameOrigin(req);
    const body = await parseJson(req, loginSchema, 8 * 1024);
    const address = loginClientAddress(req);
    // Atomically consume both budgets before the expensive password check.
    await reserveLoginAttempts(body.email, address);

    const db = getDb();
    const user = await db.user.findUnique({
      where: { email: body.email },
      include: {
        memberships: { include: { org: true }, orderBy: { createdAt: "asc" } },
      },
    });

    const passwordValid = user?.passwordHash
      ? await verifyPassword(body.password, user.passwordHash)
      : (await burnPasswordCheck(body.password), false);

    if (!user || !passwordValid || user.memberships.length === 0) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const activeMembership =
      user.memberships.find((membership) => membership.orgId === user.defaultOrgId) ??
      user.memberships[0];

    await clearLoginAttempts(body.email, address);
    await db.session.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });

    const created = await createDatabaseSession({
      userId: user.id,
      orgId: activeMembership.orgId,
    });
    const context = await resolveSessionToken(created.token);
    if (!context) throw new ApiError(500, "SESSION_CREATE_FAILED", "Could not create session");

    await db.auditLog.create({
      data: {
        orgId: context.orgId,
        userId: context.userId,
        action: "auth.login",
        entityType: "session",
        entityId: context.sessionId,
      },
    });

    const response = NextResponse.json({ session: toClientSession(context) });
    setSessionCookie(response, created.token, created.expiresAt);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Request-ID", requestId);
    logEvent("info", "auth_login_succeeded", {
      requestId,
      route: req.nextUrl.pathname,
      userId: context.userId,
      organizationId: context.orgId,
      durationMs: Date.now() - startedAt,
      status: 200,
    });
    return response;
  } catch (error) {
    const response = apiErrorResponse(error, requestId);
    response.headers.set("X-Request-ID", requestId);
    const fields = {
      requestId,
      route: req.nextUrl.pathname,
      durationMs: Date.now() - startedAt,
      status: response.status,
      errorCode:
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "INTERNAL_ERROR",
    };
    if (response.status >= 500) await reportServerError("auth_login_failed", fields);
    else logEvent("warn", "auth_login_rejected", fields);
    return response;
  }
}
