import { describe, expect, test } from "bun:test";

import { executeTenantAction } from "../src/lib/owner-ai/action-executor";
import type { AuthContext } from "../src/lib/auth/session";

const viewerContext: AuthContext = {
  sessionId: "session",
  sessionTokenHash: "hash",
  userId: "viewer",
  orgId: "org",
  role: "VIEWER",
  expiresAt: new Date(Date.now() + 60_000),
  user: { id: "viewer", email: "viewer@example.invalid", name: "Viewer", avatarUrl: "" },
  organizations: [{ id: "org", name: "Org", slug: "org", plan: "starter", role: "VIEWER" }],
};

describe("Owner AI action authorization", () => {
  test.each(["createTask", "assignTask", "generateReport"])(
    "VIEWER cannot execute %s even if model output reaches the sink",
    async (action) => {
      await expect(executeTenantAction(viewerContext, action, {})).rejects.toMatchObject({
        status: 403,
        code: "FORBIDDEN",
      });
    },
  );
});
