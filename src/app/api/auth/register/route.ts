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
import { hashPassword } from "@/lib/auth/password";
import {
  clearLoginAttempts,
  loginClientAddress,
  reserveLoginAttempts,
} from "@/lib/auth/login-throttle";
import { getDb } from "@/lib/db";
import { logEvent, reportServerError, requestIdFrom } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public registration creates exactly one OWNER membership bound to a brand
// new organization. Subsequent members are invited/removed by that OWNER via
// the team API — public self-registration for non-owner roles is intentionally
// disabled to keep tenant onboarding controlled.
const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8).max(128),
    name: z.string().trim().min(1).max(120),
    locale: z.string().trim().min(2).max(8).optional(),
    company: z
      .object({
        name: z.string().trim().min(2).max(160),
        slug: z
          .string()
          .trim()
          .min(2)
          .max(60)
          .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "slug must be lowercase, digits and dashes only"),
        plan: z.enum(["starter", "growth", "scale", "enterprise"]).optional(),
      })
      .strict(),
  })
  .strict();

function slugifyCandidate(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = requestIdFrom(req);
  try {
    assertSameOrigin(req);
    const body = await parseJson(req, registerSchema, 16 * 1024);
    const address = loginClientAddress(req);
    // Reuse the login throttle budget keyed by email so registration abuse is
    // bounded by the same per-address/per-identity window as sign-in.
    await reserveLoginAttempts(body.email, address);

    const db = getDb();

    const existingUser = await db.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }

    // Ensure a unique slug. If the requested slug is taken, append a short
    // deterministic suffix so onboarding never dead-ends on a collision.
    let slug = body.company.slug;
    const slugOwner = await db.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (slugOwner) {
      const base = slug.replace(/-\d+$/, "");
      for (let attempt = 1; attempt <= 12; attempt += 1) {
        const candidate = `${base}-${attempt}`.slice(0, 60);
        const clash = await db.organization.findUnique({
          where: { slug: candidate },
          select: { id: true },
        });
        if (!clash) {
          slug = candidate;
          break;
        }
      }
      if (slug === body.company.slug) {
        throw new ApiError(409, "SLUG_TAKEN", "Organization slug is already in use");
      }
    }

    const passwordHash = await hashPassword(body.password);

    const created = await db.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: body.company.name,
          slug,
          plan: body.company.plan ?? "starter",
        },
      });

      const user = await tx.user.create({
        data: {
          email: body.email,
          name: body.name,
          passwordHash,
          locale: body.locale ?? "hy",
          defaultOrgId: organization.id,
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          orgId: organization.id,
          role: "OWNER",
        },
      });

      await tx.auditLog.create({
        data: {
          orgId: organization.id,
          userId: user.id,
          action: "auth.owner_registered",
          entityType: "organization",
          entityId: organization.id,
          metadata: JSON.stringify({ membershipId: membership.id, slug }),
        },
      });

      return { organization, user };
    });

    await clearLoginAttempts(body.email, address);

    const session = await createDatabaseSession({
      userId: created.user.id,
      orgId: created.organization.id,
    });
    const context = await resolveSessionToken(session.token);
    if (!context) throw new ApiError(500, "SESSION_CREATE_FAILED", "Could not create session");

    const response = NextResponse.json({ session: toClientSession(context) }, { status: 201 });
    setSessionCookie(response, session.token, session.expiresAt);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Request-ID", requestId);
    logEvent("info", "auth_owner_registered", {
      requestId,
      route: req.nextUrl.pathname,
      userId: context.userId,
      organizationId: context.orgId,
      durationMs: Date.now() - startedAt,
      status: 201,
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
    if (response.status >= 500) await reportServerError("auth_register_failed", fields);
    else logEvent("warn", "auth_register_rejected", fields);
    return response;
  }
}

// Exposed for tests that need deterministic slug derivation from company names.
export function _slugify(input: string): string {
  return slugifyCandidate(input);
}