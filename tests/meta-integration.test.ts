import { afterEach, describe, expect, test } from "bun:test";

import {
  createMetaOAuthState,
  openIntegrationSecret,
  sealIntegrationSecret,
  verifyMetaOAuthState,
} from "../src/lib/integrations/meta";

const original = {
  appSecret: process.env.HAYDEV_META_APP_SECRET,
  encryptionKey: process.env.HAYDEV_INTEGRATION_ENCRYPTION_KEY,
};

const context = {
  sessionId: "session_test",
  sessionTokenHash: "hash_test",
  userId: "user_test",
  orgId: "org_test",
  role: "OWNER" as const,
  expiresAt: new Date(Date.now() + 60_000),
  user: { id: "user_test", email: "owner@example.test", name: "Owner", avatarUrl: "" },
  organizations: [],
};

afterEach(() => {
  process.env.HAYDEV_META_APP_SECRET = original.appSecret;
  process.env.HAYDEV_INTEGRATION_ENCRYPTION_KEY = original.encryptionKey;
});

describe("official Meta connector boundary", () => {
  test("binds OAuth state to the tenant, user and provider", () => {
    process.env.HAYDEV_META_APP_SECRET = "meta-app-secret-test";
    const state = createMetaOAuthState(context, "instagram");
    expect(verifyMetaOAuthState(state, context)).toBe("instagram");
    expect(() => verifyMetaOAuthState(state, { ...context, orgId: "other_org" })).toThrow("META_OAUTH_STATE_INVALID");
  });

  test("seals connector tokens without exposing plaintext", () => {
    process.env.HAYDEV_INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const sealed = sealIntegrationSecret("access-token-value");
    expect(sealed).not.toContain("access-token-value");
    expect(openIntegrationSecret(sealed)).toBe("access-token-value");
  });
});
