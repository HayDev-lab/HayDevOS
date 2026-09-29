import { describe, expect, test } from "bun:test";

import { offlineRespond } from "../src/app/api/owner-ai/offline";

describe("Owner AI offline reads", () => {
  test("prefers the authenticated tenant adapter even when demo data is enabled", async () => {
    const calls: string[] = [];
    await offlineRespond("find Persistent Lead", {
      conversationId: "conv-test",
      runId: "run-test",
      mode: "OBSERVE",
      allowDemoData: true,
      dispatchRead: async (name, args) => {
        calls.push(name);
        return {
          result: {
            leads: [{ id: "lead-1", name: "Persistent Lead", orgId: "tenant-1" }],
            quotes: [],
            documents: [],
            query: args.query,
          },
          durationMs: 1,
        };
      },
    });

    expect(calls).toEqual(["searchGlobal"]);
  });
});
