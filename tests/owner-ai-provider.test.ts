import { describe, expect, test } from "bun:test";

import { createOwnerAiCompletion } from "../src/lib/owner-ai/provider";

const environment = {
  NODE_ENV: "production",
  OWNER_AI_BASE_URL: "https://provider.example.invalid/v1",
  OWNER_AI_API_KEY: "test-key-long-enough",
  OWNER_AI_MODEL: "audit-model",
} as NodeJS.ProcessEnv;

describe("Owner AI provider boundary", () => {
  test("uses a real system role and requests a bounded model response", async () => {
    let body: Record<string, unknown> | undefined;
    const result = await createOwnerAiCompletion(
      [{ role: "system", content: "policy" }, { role: "user", content: "hello" }],
      {
        environment,
        fetchImpl: async (_url, init) => {
          body = JSON.parse(String(init?.body));
          return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }));
        },
      },
    );
    expect(result.choices?.[0]?.message?.content).toBe("ok");
    expect(body).toMatchObject({ max_tokens: 4096 });
    expect(body?.messages).toEqual([
      { role: "system", content: "policy" },
      { role: "user", content: "hello" },
    ]);
  });

  test("aborts before parsing an oversized provider response", async () => {
    await expect(createOwnerAiCompletion(
      [{ role: "user", content: "hello" }],
      {
        environment,
        fetchImpl: async () => new Response("x".repeat(1024 * 1024 + 1)),
      },
    )).rejects.toThrow("OWNER_AI_PROVIDER_RESPONSE_TOO_LARGE");
  });
});
