import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import {
  TENANT_ROLES,
  type ClientSession,
  type TenantRole,
} from "./types";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const COOKIE_BASE_NAME = "haydev_session";

export interface AuthContext {
  sessionId: string;
  sessionTokenHash: string;
  userId: string;
  orgId: string;
  role: TenantRole;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string;
  };
  organizations: ClientSession["organizations"];
}

function cookieName(): string {
  return process.env.NODE_ENV === "production"
    ? `__Host-${COOKIE_BASE_NAME}`
    : COOKIE_BASE_NAME;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function normalizeRole(role: string): TenantRole {
  return TENANT_ROLES.includes(role as TenantRole)
    ? (role as TenantRole)
    : "VIEWER";
}

function tokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const acceptedName = cookieName();
  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    const name = pair.slice(0, separator).trim();
    if (name !== acceptedName) continue;
    try {
      const token = decodeURIComponent(pair.slice(separator + 1));
      return /^[A-Za-z0-9_-]{32,128}$/.test(token) ? token : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function resolveSessionToken(token: string | null): Promise<AuthContext | null> {
  if (!token || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) return null;

  const db = getDb();
  const tokenHash = hashSessionToken(token);
  const session = await db.session.findUnique({
    where: { token: tokenHash },
    include: {
      user: {
        include: {
          memberships: { include: { org: true }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  // Tenant invariant: a session without an active organization cannot enter
  // tenant-protected API context. Memberships are loaded in the same bounded
  // session query, but no membership or default tenant can replace a null org.
  if (!session.orgId) {
    return null;
  }

  const activeMembership = session.user.memberships.find(
    (membership) => membership.orgId === session.orgId,
  );
  if (!activeMembership) return null;

  return {
    sessionId: session.id,
    sessionTokenHash: tokenHash,
    userId: session.userId,
    orgId: activeMembership.orgId,
    role: normalizeRole(activeMembership.role),
    expiresAt: session.expiresAt,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? session.user.email,
      avatarUrl: session.user.avatarUrl ?? "",
    },
    organizations: session.user.memberships.map((membership) => ({
      id: membership.org.id,
      name: membership.org.name,
      slug: membership.org.slug,
      plan: membership.org.plan,
      role: normalizeRole(membership.role),
    })),
  };
}

export async function getOptionalAuthContext(
  req?: NextRequest,
): Promise<AuthContext | null> {
  const token = req
    ? tokenFromCookieHeader(req.headers.get("cookie"))
    : (await cookies()).get(cookieName())?.value ?? null;
  return resolveSessionToken(token);
}

export async function requireAuthContext(req: NextRequest): Promise<AuthContext> {
  const context = await getOptionalAuthContext(req);
  if (!context) throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  return context;
}

export function requireRole(
  context: AuthContext,
  roles: readonly TenantRole[],
): void {
  if (!roles.includes(context.role)) {
    throw new ApiError(403, "FORBIDDEN", "Insufficient permissions");
  }
}

export function toClientSession(context: AuthContext): ClientSession {
  const activeOrganization = context.organizations.find(
    (organization) => organization.id === context.orgId,
  );
  if (!activeOrganization) {
    throw new ApiError(401, "INVALID_SESSION", "Session tenant is no longer available");
  }

  return {
    user: {
      ...context.user,
      role: context.role,
    },
    activeOrganization,
    organizations: context.organizations,
    expiresAt: context.expiresAt.toISOString(),
  };
}

export async function createDatabaseSession(input: {
  userId: string;
  orgId: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: {
      userId: input.userId,
      orgId: input.orgId,
      token: hashSessionToken(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
): void {
  response.cookies.set(cookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

export function clearSessionCookie(response: NextResponse): void {
  for (const name of new Set([cookieName(), COOKIE_BASE_NAME])) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
    });
  }
}
