import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";

import {
  createOwnerAiCompletion,
  openClawCapabilities,
  ownerAiProviderConfigured,
} from "../src/lib/owner-ai/provider";

const environment = {
  NODE_ENV: "production",
  OWNER_AI_BASE_URL: "https://provider.example.invalid/v1",
  OWNER_AI_API_KEY: "test-key-long-enough",
  OWNER_AI_MODEL: "audit-model",
} as NodeJS.ProcessEnv;

const brokerEnvironment = {
  NODE_ENV: "production",
  OWNER_AI_BACKEND: "openclaw-broker",
  HAYDEV_OPENCLAW_BROKER_URL: "https://broker.example.invalid",
  HAYDEV_OPENCLAW_BROKER_TOKEN: "broker-token-long-enough-for-test",
  HAYDEV_OPENCLAW_BROKER_HMAC_KEY: "broker-hmac-secret-with-at-least-thirty-two-characters",
} as NodeJS.ProcessEnv;

const brokerContext = {
  tenantId: "org_test",
  actorUserId: "user_test",
  actorRole: "OWNER",
  locale: "en" as const,
  conversationId: "conv_test",
  requestId: "run_12345678",
  correlationId: "corr_12345678",
  actionIntent: "assist" as const,
  riskClass: "read" as const,
  originTrustLevel: "authenticated_owner_ai" as const,
};

function brokerSignature(timestamp: string, requestId: string, body: string): string {
  const secret = brokerEnvironment.HAYDEV_OPENCLAW_BROKER_HMAC_KEY!;
  return `v1=${createHmac("sha256", secret).update(`${timestamp}.${requestId}.${body}`, "utf8").digest("hex")}`;
}

describe("Owner AI provider boundary", () => {
  test("keeps OpenClaw browser/research/media capabilities opt-in", () => {
    expect(openClawCapabilities({} as NodeJS.ProcessEnv)).toEqual({ browser: false, webSearch: false, mediaGeneration: false, studio: false });
    expect(openClawCapabilities({ HAYDEV_OPENCLAW_TOOL_POLICY: "browser,web_search,media_generation,unknown" } as unknown as NodeJS.ProcessEnv)).toEqual({ browser: true, webSearch: true, mediaGeneration: true, studio: false });
  });

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

  test("uses the signed broker protocol instead of a raw Gateway endpoint", async () => {
    let requestUrl = "";
    let requestBody: Record<string, unknown> | undefined;
    const responseBody = JSON.stringify({
      requestId: brokerContext.requestId,
      status: "completed",
      output: "broker result",
      model: "configured-route",
    });
    const responseTimestamp = String(Date.now());
    const result = await createOwnerAiCompletion(
      [{ role: "system", content: "policy" }, { role: "user", content: "hello" }],
      {
        environment: brokerEnvironment,
        context: brokerContext,
        fetchImpl: async (url, init) => {
          requestUrl = String(url);
          requestBody = JSON.parse(String(init?.body));
          const headers = new Headers({
            "x-haydev-timestamp": responseTimestamp,
            "x-haydev-signature": brokerSignature(responseTimestamp, brokerContext.requestId, responseBody),
          });
          return new Response(responseBody, { headers });
        },
      },
    );
    expect(requestUrl).toBe("https://broker.example.invalid/v1/haydev/owner-ai/completions");
    expect(requestBody).toMatchObject({
      protocol: "haydevos-openclaw-broker/v1",
      requestId: brokerContext.requestId,
      context: { tenantId: "org_test", actorUserId: "user_test" },
      capabilities: { domainTools: false, shell: false, browser: false, filesystem: false },
    });
    expect(result.choices?.[0]?.message?.content).toBe("broker result");
    expect(result.model).toBe("configured-route");
  });

  test("rejects a broker response without a valid HMAC signature", async () => {
    await expect(createOwnerAiCompletion(
      [{ role: "user", content: "hello" }],
      {
        environment: brokerEnvironment,
        context: brokerContext,
        fetchImpl: async () => new Response(
          JSON.stringify({ requestId: brokerContext.requestId, status: "completed", output: "untrusted" }),
          { headers: { "x-haydev-timestamp": String(Date.now()), "x-haydev-signature": "v1=bad" } },
        ),
      },
    )).rejects.toThrow("OWNER_AI_BROKER_INVALID_SIGNATURE");
  });

  test("does not report an incomplete broker configuration as usable", () => {
    expect(ownerAiProviderConfigured({ ...brokerEnvironment, HAYDEV_OPENCLAW_BROKER_HMAC_KEY: "short" })).toBe(false);
  });

  test("refuses the documented raw Gateway port as a broker URL", () => {
    expect(ownerAiProviderConfigured({ ...brokerEnvironment, HAYDEV_OPENCLAW_BROKER_URL: "https://gateway.example.invalid:18789" })).toBe(false);
  });

  test("permits cleartext only for a loopback broker", () => {
    expect(ownerAiProviderConfigured({ ...brokerEnvironment, HAYDEV_OPENCLAW_BROKER_URL: "http://127.0.0.1:19790" })).toBe(true);
    expect(ownerAiProviderConfigured({ ...brokerEnvironment, HAYDEV_OPENCLAW_BROKER_URL: "http://broker.example.invalid" })).toBe(false);
  });
});
