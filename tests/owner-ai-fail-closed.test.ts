import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";

import { POST } from "../src/app/api/owner-ai/route";
import { GET as GET_STATE } from "../src/app/api/owner-ai/state/route";
import { hashSessionToken } from "../src/lib/auth/session";
import {
  ownerAiDemoEnabled,
  ownerAiProviderConfigured,
} from "../src/lib/owner-ai/provider";

setDefaultTimeout(30_000);

const db = new PrismaClient();
const suffix = `${Date.now()}_${process.pid}`;
const orgId = `owner_ai_fc_org_${suffix}`;
const userId = `owner_ai_fc_user_${suffix}`;
const token = `owner_ai_fc_session_${suffix}`.padEnd(40, "0");
const env = process.env as Record<string, string | undefined>;
const managedKeys = [
  "NODE_ENV",
  "APP_ORIGINS",
  "OWNER_AI_BASE_URL",
  "OWNER_AI_API_KEY",
  "OWNER_AI_MODEL",
  "HAYDEV_ALLOW_DEMO_DATA",
] as const;
const originalEnvironment = Object.fromEntries(
  managedKeys.map((key) => [key, env[key]]),
) as Record<(typeof managedKeys)[number], string | undefined>;

function setEnvironment(patch: Partial<typeof originalEnvironment>): void {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
}

function restoreEnvironment(): void {
  setEnvironment(originalEnvironment);
}

beforeAll(async () => {
  await db.organization.create({
    data: { id: orgId, name: "Owner AI fail closed", slug: `owner-ai-fc-${suffix}` },
  });
  await db.user.create({
    data: { id: userId, email: `owner-ai-fc-${suffix}@example.invalid` },
  });
  await db.membership.create({ data: { orgId, userId, role: "OWNER" } });
  await db.session.create({
    data: {
      userId,
      orgId,
      token: hashSessionToken(token),
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
});

afterAll(async () => {
  restoreEnvironment();
  await db.organization.deleteMany({ where: { id: orgId } });
  await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});

describe("Owner AI production fail-closed", () => {
  test("authenticated production request gets a controlled configuration error and no synthetic response", async () => {
    setEnvironment({
      NODE_ENV: "production",
      APP_ORIGINS: "https://owner-ai.example.invalid",
      OWNER_AI_BASE_URL: undefined,
      OWNER_AI_API_KEY: undefined,
      OWNER_AI_MODEL: undefined,
      HAYDEV_ALLOW_DEMO_DATA: "true",
    });

    try {
      const request = new NextRequest("https://owner-ai.example.invalid/api/owner-ai", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://owner-ai.example.invalid",
          cookie: `__Host-haydev_session=${encodeURIComponent(token)}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Give me a status update" }],
          mode: "OBSERVE",
          activeModule: "dashboard",
        }),
      });

      const response = await POST(request);
      const body = await response.json();
      const serialized = JSON.stringify(body);

      expect(response.status).toBe(503);
      expect(body).toMatchObject({
        error: {
          code: "OWNER_AI_PROVIDER_NOT_CONFIGURED",
          message: "Owner AI is unavailable because its provider is not configured",
        },
      });
      expect(serialized).not.toContain("offline-fallback");
      expect(serialized).not.toContain("synthetic");
      expect(serialized).not.toContain("OWNER_AI_API_KEY");
    } finally {
      restoreEnvironment();
    }
  });

  test("offline/demo mode requires both non-production and an explicit flag", () => {
    expect(ownerAiDemoEnabled({
      NODE_ENV: "production",
      HAYDEV_ALLOW_DEMO_DATA: "true",
    } as NodeJS.ProcessEnv)).toBe(false);
    expect(ownerAiDemoEnabled({
      NODE_ENV: "development",
    } as NodeJS.ProcessEnv)).toBe(false);
    expect(ownerAiDemoEnabled({
      NODE_ENV: "development",
      HAYDEV_ALLOW_DEMO_DATA: "true",
    } as NodeJS.ProcessEnv)).toBe(true);
  });

  test("production state reports unavailable instead of claiming an offline fallback", async () => {
    setEnvironment({
      NODE_ENV: "production",
      APP_ORIGINS: "https://owner-ai.example.invalid",
      OWNER_AI_BASE_URL: undefined,
      OWNER_AI_API_KEY: undefined,
      OWNER_AI_MODEL: undefined,
      HAYDEV_ALLOW_DEMO_DATA: "true",
    });

    try {
      expect(ownerAiProviderConfigured()).toBe(false);
      const response = await GET_STATE(new NextRequest(
        "https://owner-ai.example.invalid/api/owner-ai/state",
        { headers: { cookie: `__Host-haydev_session=${encodeURIComponent(token)}` } },
      ));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.config).toMatchObject({ provider: "unavailable", model: null });
    } finally {
      restoreEnvironment();
    }
  });
});
