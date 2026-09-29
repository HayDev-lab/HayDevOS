import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { hashSessionToken, resolveSessionToken } from "../src/lib/auth/session";
import { withTenantApi } from "../src/lib/api/handler";

setDefaultTimeout(30_000);

const db = new PrismaClient();
const suffix = `${Date.now()}_${process.pid}`;
const orgId = `nullorg_org_${suffix}`;
const userId = `nullorg_user_${suffix}`;
const token = `nullorg_session_token_${suffix}`.padEnd(40, "0");

beforeAll(async () => {
  await db.organization.create({ data: { id: orgId, name: "NullOrg", slug: `nullorg-${suffix}` } });
  await db.user.create({ data: { id: userId, email: `nullorg-${suffix}@example.invalid` } });
  await db.membership.create({ data: { orgId, userId, role: "OWNER" } });
  // Create a session record with orgId = null to simulate the legacy/edge case.
  await db.session.create({
    data: {
      userId,
      orgId: null,
      token: hashSessionToken(token),
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
});

afterAll(async () => {
  await db.session.deleteMany({ where: { userId } });
  await db.membership.deleteMany({ where: { userId } });
  await db.user.deleteMany({ where: { id: userId } });
  await db.organization.deleteMany({ where: { id: orgId } });
  await db.$disconnect();
});

describe("Session tenant invariant — null orgId fails closed", () => {
  test("resolveSessionToken returns null for a session without orgId", async () => {
    const context = await resolveSessionToken(token);
    // A session with orgId = null must NEVER produce an AuthContext. This
    // guarantees tenant-protected API routes reject before any business query.
    expect(context).toBeNull();
  });

  test("requireAuthContext rejects a null-org session without DB business queries", async () => {
    const cookieName = process.env.NODE_ENV === "production"
      ? "__Host-haydev_session"
      : "haydev_session";
    const request = new NextRequest("http://localhost/api/leados/overview", {
      headers: { cookie: `${cookieName}=${encodeURIComponent(token)}` },
    });
    let businessQueryExecuted = false;

    const response = await withTenantApi(request, {}, async () => {
      businessQueryExecuted = true;
      return NextResponse.json({ shouldNotRun: true });
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
    expect(businessQueryExecuted).toBe(false);
  });

  test("malformed cookie encoding is rejected as unauthenticated", async () => {
    const request = new NextRequest("http://localhost/api/leados/overview", {
      headers: { cookie: "haydev_session=%" },
    });
    const response = await withTenantApi(request, {}, async () =>
      NextResponse.json({ shouldNotRun: true }));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
  });

  test("production ignores the legacy non-Host session cookie", async () => {
    const original = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    try {
      const request = new NextRequest("https://app.example.invalid/api/leados/overview", {
        headers: { cookie: `haydev_session=${encodeURIComponent(token)}` },
      });
      const response = await withTenantApi(request, {}, async () =>
        NextResponse.json({ shouldNotRun: true }));
      expect(response.status).toBe(401);
    } finally {
      if (original === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
      else (process.env as Record<string, string | undefined>).NODE_ENV = original;
    }
  });
});
