import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const BROKER_PROTOCOL = "haydevos-openclaw-broker/v1";
export const BROKER_PATH = "/v1/haydev/owner-ai/completions";
export const MAX_REQUEST_BYTES = 512 * 1024;
export const MAX_GATEWAY_RESPONSE_BYTES = 1024 * 1024;
export const SIGNATURE_MAX_AGE_MS = 5 * 60_000;
const MAX_REPLAY_CACHE_ENTRIES = 10_000;

const REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/;
const PRINCIPAL_ID = /^[A-Za-z0-9_-]{1,128}$/;
const AGENT_TARGET = /^openclaw\/(?:default|[A-Za-z0-9_-]{1,96})$/;
const ALLOWED_ROLES = new Set(["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"]);
const ALLOWED_LOCALES = new Set(["hy", "ru", "en"]);
const ALLOWED_INTENTS = new Set(["observe", "assist", "auto"]);
const ALLOWED_RISKS = new Set(["read", "approval-gated"]);
const ALLOWED_TOOL_CAPABILITIES = new Set(["browser", "web_search", "media_generation", "studio"]);

function inputError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function header(headers, name) {
  if (headers instanceof Headers) return headers.get(name);
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  const value = found?.[1];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function signature(secret, value) {
  return `v1=${createHmac("sha256", secret).update(value, "utf8").digest("hex")}`;
}

function sameSecret(expected, actual) {
  if (typeof actual !== "string" || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(actual, "utf8"));
}

function requireString(value, maximum, code) {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum) throw inputError(code);
  return value;
}

function baseUrl(raw, label, allowedProtocols, loopbackOnly = false) {
  let url;
  try {
    url = new URL(requireString(raw, 2_048, `${label}_REQUIRED`));
  } catch {
    throw inputError(`${label}_INVALID`);
  }
  if (!allowedProtocols.has(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw inputError(`${label}_INVALID`);
  }
  if (url.pathname !== "/" && url.pathname !== "") throw inputError(`${label}_INVALID`);
  if (loopbackOnly && !["127.0.0.1", "::1", "[::1]", "localhost"].includes(url.hostname)) {
    throw inputError(`${label}_MUST_BE_LOOPBACK`);
  }
  return url;
}

export function loadBrokerConfiguration(source = process.env) {
  const applicationToken = source.HAYDEV_OPENCLAW_BROKER_TOKEN?.trim();
  const hmacKey = source.HAYDEV_OPENCLAW_BROKER_HMAC_KEY?.trim();
  const gatewayToken = source.HAYDEV_OPENCLAW_GATEWAY_TOKEN?.trim();
  if (!applicationToken || applicationToken.length < 24) throw inputError("BROKER_TOKEN_REQUIRED");
  if (!hmacKey || hmacKey.length < 32) throw inputError("BROKER_HMAC_KEY_REQUIRED");
  if (!gatewayToken || gatewayToken.length < 24) throw inputError("GATEWAY_TOKEN_REQUIRED");

  const bindHost = source.HAYDEV_OPENCLAW_BROKER_BIND?.trim() || "127.0.0.1";
  if (!["127.0.0.1", "::1", "localhost"].includes(bindHost)) throw inputError("BROKER_BIND_MUST_BE_LOOPBACK");
  const port = Number(source.HAYDEV_OPENCLAW_BROKER_PORT ?? "19790");
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw inputError("BROKER_PORT_INVALID");
  const gateway = baseUrl(
    source.HAYDEV_OPENCLAW_GATEWAY_URL,
    "GATEWAY_URL",
    new Set(["http:", "https:"]),
    true,
  );
  gateway.pathname = "/v1/chat/completions";
  const agentTarget = source.HAYDEV_OPENCLAW_AGENT_TARGET?.trim() || "openclaw/default";
  if (!AGENT_TARGET.test(agentTarget)) throw inputError("GATEWAY_AGENT_TARGET_INVALID");
  const timeoutMs = Number(source.HAYDEV_OPENCLAW_GATEWAY_TIMEOUT_MS ?? "45000");
  if (!Number.isFinite(timeoutMs) || timeoutMs < 5_000 || timeoutMs > 120_000) {
    throw inputError("GATEWAY_TIMEOUT_INVALID");
  }
  const toolPolicy = new Set(
    (source.HAYDEV_OPENCLAW_TOOL_POLICY ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  if ([...toolPolicy].some((value) => !ALLOWED_TOOL_CAPABILITIES.has(value))) throw inputError("TOOL_POLICY_INVALID");

  return {
    applicationToken,
    hmacKey,
    gatewayToken,
    bindHost,
    port,
    gatewayUrl: gateway.toString(),
    agentTarget,
    timeoutMs: Math.trunc(timeoutMs),
    toolPolicy,
  };
}

function parseRequest(rawBody, headers, config, now) {
  if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) throw inputError("REQUEST_TOO_LARGE");
  const authorization = header(headers, "authorization");
  if (!sameSecret(`Bearer ${config.applicationToken}`, authorization)) throw inputError("UNAUTHORIZED");
  if (header(headers, "x-haydev-broker-protocol") !== "v1") throw inputError("PROTOCOL_REQUIRED");

  const requestId = header(headers, "x-haydev-request-id");
  const timestamp = header(headers, "x-haydev-timestamp");
  const timestampMs = Number(timestamp);
  if (!requestId || !REQUEST_ID.test(requestId) || !Number.isSafeInteger(timestampMs) || Math.abs(now - timestampMs) > SIGNATURE_MAX_AGE_MS) {
    throw inputError("INVALID_REQUEST_AUTH");
  }
  const expectedSignature = signature(config.hmacKey, `${timestamp}.${requestId}.${rawBody}`);
  if (!sameSecret(expectedSignature, header(headers, "x-haydev-signature"))) throw inputError("INVALID_REQUEST_SIGNATURE");

  let value;
  try {
    value = JSON.parse(rawBody);
  } catch {
    throw inputError("INVALID_JSON");
  }
  if (!value || typeof value !== "object" || value.protocol !== BROKER_PROTOCOL || value.requestId !== requestId) {
    throw inputError("INVALID_REQUEST");
  }
  const context = value.context;
  if (!context || typeof context !== "object") throw inputError("INVALID_CONTEXT");
  const tenantId = requireString(context.tenantId, 128, "INVALID_CONTEXT");
  const actorUserId = requireString(context.actorUserId, 128, "INVALID_CONTEXT");
  const conversationId = requireString(context.conversationId, 128, "INVALID_CONTEXT");
  const correlationId = requireString(context.correlationId, 128, "INVALID_CONTEXT");
  if (![tenantId, actorUserId, conversationId, correlationId].every((value) => PRINCIPAL_ID.test(value))) {
    throw inputError("INVALID_CONTEXT");
  }
  if (!ALLOWED_ROLES.has(context.actorRole) || !ALLOWED_LOCALES.has(context.locale) || !ALLOWED_INTENTS.has(context.actionIntent) || !ALLOWED_RISKS.has(context.riskClass) || context.originTrustLevel !== "authenticated_owner_ai" || context.requestId !== requestId) {
    throw inputError("INVALID_CONTEXT");
  }

  if (!Array.isArray(value.messages) || value.messages.length < 1 || value.messages.length > 120) {
    throw inputError("INVALID_MESSAGES");
  }
  const messages = value.messages.map((message) => {
    if (!message || typeof message !== "object" || !["system", "user", "assistant"].includes(message.role)) {
      throw inputError("INVALID_MESSAGES");
    }
    return { role: message.role, content: requireString(message.content, 20_000, "INVALID_MESSAGES") };
  });

  return { requestId, tenantId, actorUserId, conversationId, messages };
}

async function boundedJson(response) {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_GATEWAY_RESPONSE_BYTES) throw inputError("GATEWAY_RESPONSE_TOO_LARGE");
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_GATEWAY_RESPONSE_BYTES) throw inputError("GATEWAY_RESPONSE_TOO_LARGE");
  try {
    return JSON.parse(text);
  } catch {
    throw inputError("GATEWAY_INVALID_RESPONSE");
  }
}

function signedResponse(status, body, requestId, config, now) {
  const payload = JSON.stringify(body);
  const timestamp = String(now);
  return {
    status,
    body: payload,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-haydev-timestamp": timestamp,
      "x-haydev-signature": signature(config.hmacKey, `${timestamp}.${requestId}.${payload}`),
    },
  };
}

export function createBrokerReplayCache() {
  const entries = new Map();

  function prune(now) {
    for (const [requestId, entry] of entries) {
      if (entry.expiresAt <= now) entries.delete(requestId);
    }
  }

  return {
    reserve(requestId, fingerprint, now) {
      prune(now);
      const existing = entries.get(requestId);
      if (existing) {
        if (existing.fingerprint !== fingerprint) throw inputError("REPLAYED_REQUEST");
        if (existing.result) return existing.result;
        throw inputError("REQUEST_IN_PROGRESS");
      }
      if (entries.size >= MAX_REPLAY_CACHE_ENTRIES) throw inputError("REPLAY_CACHE_FULL");
      entries.set(requestId, { fingerprint, expiresAt: now + SIGNATURE_MAX_AGE_MS });
      return null;
    },
    complete(requestId, fingerprint, result, now) {
      entries.set(requestId, { fingerprint, result, expiresAt: now + SIGNATURE_MAX_AGE_MS });
    },
    release(requestId, fingerprint) {
      const existing = entries.get(requestId);
      if (existing && existing.fingerprint === fingerprint && !existing.result) entries.delete(requestId);
    },
  };
}

export async function handleBrokerCompletion({
  headers,
  rawBody,
  config,
  replayCache,
  fetchImpl = fetch,
  now = Date.now(),
}) {
  const request = parseRequest(rawBody, headers, config, now);
  const fingerprint = createHash("sha256").update(rawBody, "utf8").digest("hex");
  const cached = replayCache?.reserve(request.requestId, fingerprint, now);
  if (cached) return cached;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const capabilityHint = config.toolPolicy.size > 0
      ? [{
          role: "system",
          content: `OpenClaw capability policy: ${[...config.toolPolicy].join(", ")}. Use only these explicitly enabled capabilities. Never use shell, filesystem, arbitrary HTTP, or direct tenant/domain writes. HayDevOS handles approvals and domain changes.`,
        }]
      : [];
    const response = await fetchImpl(config.gatewayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.gatewayToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.agentTarget,
        messages: [...capabilityHint, ...request.messages],
        stream: false,
        tool_choice: config.toolPolicy.size > 0 ? "auto" : "none",
        max_completion_tokens: 4096,
        // Gateway `user` selects a session; it is not used as authorization.
        user: `haydev:${request.tenantId}:${request.actorUserId}:${request.conversationId}`,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw inputError(`GATEWAY_HTTP_${response.status}`);
    const result = await boundedJson(response);
    const choice = result?.choices?.[0];
    if (choice?.message?.tool_calls || typeof choice?.message?.content !== "string" || choice.message.content.length === 0) {
      throw inputError("GATEWAY_TOOL_OR_CONTENT_REJECTED");
    }
    const model = typeof result.model === "string" && result.model.length <= 120 ? result.model : config.agentTarget;
    const completed = signedResponse(200, {
      requestId: request.requestId,
      status: "completed",
      output: choice.message.content,
      model,
    }, request.requestId, config, now);
    replayCache?.complete(request.requestId, fingerprint, completed, now);
    return completed;
  } catch (error) {
    replayCache?.release(request.requestId, fingerprint);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function brokerErrorResponse(error) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "BROKER_INTERNAL_ERROR";
  const status = code === "UNAUTHORIZED" || code.includes("SIGNATURE") || code.includes("AUTH") ? 401
    : code === "REQUEST_TOO_LARGE" ? 413
      : code === "REPLAYED_REQUEST" || code === "REQUEST_IN_PROGRESS" ? 409
        : code === "REPLAY_CACHE_FULL" ? 503
      : code.startsWith("GATEWAY_") ? 502
        : code === "BROKER_INTERNAL_ERROR" ? 500
          : 400;
  return { status, body: JSON.stringify({ error: code }), headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } };
}
