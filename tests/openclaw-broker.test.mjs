import { createHmac } from "node:crypto";

import { describe, expect, test } from "bun:test";

import {
  BROKER_PROTOCOL,
  createBrokerReplayCache,
  handleBrokerCompletion,
  loadBrokerConfiguration,
} from "../scripts/openclaw-broker-lib.mjs";

const now = 1_790_000_000_000;
const hmacKey = "broker-hmac-secret-with-at-least-thirty-two-characters";
const environment = {
  HAYDEV_OPENCLAW_BROKER_TOKEN: "broker-token-long-enough-for-test",
  HAYDEV_OPENCLAW_BROKER_HMAC_KEY: hmacKey,
  HAYDEV_OPENCLAW_GATEWAY_TOKEN: "gateway-token-long-enough-for-test",
  HAYDEV_OPENCLAW_GATEWAY_URL: "http://127.0.0.1:18789",
  HAYDEV_OPENCLAW_AGENT_TARGET: "openclaw/default",
};

function sign(value) {
  return `v1=${createHmac("sha256", hmacKey).update(value, "utf8").digest("hex")}`;
}

function signedRequest(overrides = {}) {
  const requestId = "run_12345678";
  const body = JSON.stringify({
    protocol: BROKER_PROTOCOL,
    requestId,
    context: {
      tenantId: "org_test",
      actorUserId: "user_test",
      actorRole: "OWNER",
      locale: "en",
      conversationId: "conv_test",
      requestId,
      correlationId: "corr_12345678",
      actionIntent: "assist",
      riskClass: "read",
      originTrustLevel: "authenticated_owner_ai",
    },
    messages: [{ role: "user", content: "hello" }],
    ...overrides,
  });
  return {
    rawBody: body,
    headers: {
      authorization: `Bearer ${environment.HAYDEV_OPENCLAW_BROKER_TOKEN}`,
      "x-haydev-broker-protocol": "v1",
      "x-haydev-request-id": requestId,
      "x-haydev-timestamp": String(now),
      "x-haydev-signature": sign(`${now}.${requestId}.${body}`),
    },
  };
}

describe("OpenClaw broker boundary", () => {
  test("pins the Gateway target and disables Gateway tools", async () => {
    let outgoing;
    const request = signedRequest();
    const result = await handleBrokerCompletion({
      ...request,
      config: loadBrokerConfiguration(environment),
      now,
      fetchImpl: async (url, init) => {
        outgoing = { url: String(url), body: JSON.parse(String(init.body)) };
        return new Response(JSON.stringify({
          model: "openclaw/default",
          choices: [{ message: { content: "safe response" } }],
        }));
      },
    });

    expect(outgoing).toEqual({
      url: "http://127.0.0.1:18789/v1/chat/completions",
      body: {
        model: "openclaw/default",
        messages: [{ role: "user", content: "hello" }],
        stream: false,
        tool_choice: "none",
        max_completion_tokens: 4096,
        user: "haydev:org_test:user_test:conv_test",
      },
    });
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body)).toMatchObject({ requestId: "run_12345678", status: "completed", output: "safe response" });
    expect(result.headers["x-haydev-signature"]).toBe(sign(`${now}.run_12345678.${result.body}`));
  });

  test("rejects an invalid application signature before calling the Gateway", async () => {
    const request = signedRequest();
    request.headers["x-haydev-signature"] = "v1=invalid";
    let calls = 0;
    await expect(handleBrokerCompletion({
      ...request,
      config: loadBrokerConfiguration(environment),
      now,
      fetchImpl: async () => {
        calls += 1;
        return new Response("{}");
      },
    })).rejects.toThrow("INVALID_REQUEST_SIGNATURE");
    expect(calls).toBe(0);
  });

  test("rejects a Gateway response that attempts a tool call", async () => {
    const request = signedRequest();
    await expect(handleBrokerCompletion({
      ...request,
      config: loadBrokerConfiguration(environment),
      now,
      fetchImpl: async () => new Response(JSON.stringify({
        choices: [{ message: { content: "ignored", tool_calls: [{ id: "call_1" }] } }],
      })),
    })).rejects.toThrow("GATEWAY_TOOL_OR_CONTENT_REJECTED");
  });

  test("returns one cached result for an identical retry and rejects a changed replay", async () => {
    const replayCache = createBrokerReplayCache();
    const request = signedRequest();
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return new Response(JSON.stringify({ choices: [{ message: { content: "once" } }] }));
    };
    const first = await handleBrokerCompletion({
      ...request,
      config: loadBrokerConfiguration(environment),
      replayCache,
      now,
      fetchImpl,
    });
    const retry = await handleBrokerCompletion({
      ...request,
      config: loadBrokerConfiguration(environment),
      replayCache,
      now,
      fetchImpl,
    });
    expect(retry).toEqual(first);
    expect(calls).toBe(1);

    const changed = signedRequest({ messages: [{ role: "user", content: "changed" }] });
    await expect(handleBrokerCompletion({
      ...changed,
      config: loadBrokerConfiguration(environment),
      replayCache,
      now,
      fetchImpl,
    })).rejects.toThrow("REPLAYED_REQUEST");
    expect(calls).toBe(1);
  });

  test("refuses a non-loopback raw Gateway address", () => {
    expect(() => loadBrokerConfiguration({
      ...environment,
      HAYDEV_OPENCLAW_GATEWAY_URL: "http://10.0.0.1:18789",
    })).toThrow("GATEWAY_URL_MUST_BE_LOOPBACK");
  });
});
