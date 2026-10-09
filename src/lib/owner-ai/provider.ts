import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { ApiError } from "@/lib/api/errors";

export type OwnerAiChatMessage = {
  role: "system" | "assistant" | "user";
  content: string;
};

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const MAX_PROVIDER_RESPONSE_BYTES = 1024 * 1024;
const OPENCLAW_BROKER_PATH = "/v1/haydev/owner-ai/completions";
const BROKER_SIGNATURE_PREFIX = "v1=";
const BROKER_SIGNATURE_MAX_AGE_MS = 5 * 60_000;

export type OwnerAiProvider = "openai-compatible" | "openclaw-broker";

export type OwnerAiInvocationContext = {
  tenantId: string;
  actorUserId: string;
  actorRole: string;
  locale: "hy" | "ru" | "en";
  conversationId: string;
  requestId: string;
  correlationId: string;
  actionIntent: "observe" | "assist" | "auto";
  riskClass: "read" | "approval-gated";
  originTrustLevel: "authenticated_owner_ai";
};

async function readBoundedJson(response: Response): Promise<unknown> {
  const text = await readBoundedText(response);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("OWNER_AI_PROVIDER_INVALID_RESPONSE");
  }
}

async function readBoundedText(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_PROVIDER_RESPONSE_BYTES) {
    throw new Error("OWNER_AI_PROVIDER_RESPONSE_TOO_LARGE");
  }
  if (!response.body) throw new Error("OWNER_AI_PROVIDER_EMPTY_RESPONSE");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_PROVIDER_RESPONSE_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new Error("OWNER_AI_PROVIDER_RESPONSE_TOO_LARGE");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export function ownerAiDemoEnabled(
  source: NodeJS.ProcessEnv = process.env,
): boolean {
  return source.NODE_ENV !== "production" && source.HAYDEV_ALLOW_DEMO_DATA === "true";
}

function openAiProviderConfiguration(source: NodeJS.ProcessEnv): {
  baseUrl: string;
  apiKey: string;
  model: string;
} {
  const baseUrl = source.OWNER_AI_BASE_URL?.trim().replace(/\/$/, "");
  const apiKey = source.OWNER_AI_API_KEY?.trim();
  const model = source.OWNER_AI_MODEL?.trim();
  if (!baseUrl || !apiKey || apiKey.length < 16 || !model || model.length > 120) {
    throw new ApiError(
      503,
      "OWNER_AI_PROVIDER_NOT_CONFIGURED",
      "Owner AI is unavailable because its provider is not configured",
    );
  }

  try {
    const url = new URL(baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("unsupported protocol");
    }
    if (source.NODE_ENV === "production" && url.protocol !== "https:") {
      throw new Error("production provider must use HTTPS");
    }
  } catch {
    throw new ApiError(
      503,
      "OWNER_AI_PROVIDER_NOT_CONFIGURED",
      "Owner AI is unavailable because its provider is not configured",
    );
  }

  return { baseUrl, apiKey, model };
}

function ownerAiProvider(source: NodeJS.ProcessEnv): OwnerAiProvider {
  const selected = source.OWNER_AI_BACKEND?.trim() || "openai-compatible";
  if (selected === "openai-compatible" || selected === "openclaw-broker") return selected;
  throw new ApiError(
    503,
    "OWNER_AI_PROVIDER_NOT_CONFIGURED",
    "Owner AI is unavailable because its provider is not configured",
  );
}

function brokerConfiguration(source: NodeJS.ProcessEnv) {
  const rawUrl = source.HAYDEV_OPENCLAW_BROKER_URL?.trim();
  const token = source.HAYDEV_OPENCLAW_BROKER_TOKEN?.trim();
  const hmacKey = source.HAYDEV_OPENCLAW_BROKER_HMAC_KEY?.trim();
  if (!rawUrl || !token || token.length < 24 || !hmacKey || hmacKey.length < 32) {
    throw new ApiError(
      503,
      "OWNER_AI_PROVIDER_NOT_CONFIGURED",
      "Owner AI is unavailable because its provider is not configured",
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL(rawUrl);
    const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname);
    if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error("unsupported broker protocol");
    if (endpoint.protocol !== "https:" && !loopback) throw new Error("non-loopback broker must use HTTPS");
    if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error("broker URL must not contain credentials, query, or fragment");
    if (endpoint.pathname !== "/" && endpoint.pathname !== "") throw new Error("broker URL must be an origin only");
    // 18789 is the documented Gateway port. This adapter is deliberately for
    // a HayDevOS broker, never for direct Gateway HTTP access.
    if (endpoint.port === "18789") throw new Error("raw Gateway port is not a broker");
    endpoint.pathname = OPENCLAW_BROKER_PATH;
  } catch {
    throw new ApiError(
      503,
      "OWNER_AI_PROVIDER_NOT_CONFIGURED",
      "Owner AI is unavailable because its provider is not configured",
    );
  }

  return { endpoint: endpoint.toString(), token, hmacKey };
}

function signedValue(secret: string, value: string): string {
  return `${BROKER_SIGNATURE_PREFIX}${createHmac("sha256", secret).update(value, "utf8").digest("hex")}`;
}

function equalSignature(expected: string, actual: string | null): boolean {
  if (!actual || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(actual, "utf8"));
}

function validRequestId(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,128}$/.test(value);
}

function parseBrokerCompletion(raw: unknown, requestId: string): {
  choices: { message?: { content?: string } }[];
  model?: string;
} {
  if (!raw || typeof raw !== "object") throw new Error("OWNER_AI_BROKER_INVALID_RESPONSE");
  const value = raw as Record<string, unknown>;
  if (value.requestId !== requestId || value.status !== "completed") {
    throw new Error("OWNER_AI_BROKER_INVALID_RESPONSE");
  }
  if (typeof value.output !== "string" || value.output.length === 0 || value.output.length > 200_000) {
    throw new Error("OWNER_AI_BROKER_INVALID_RESPONSE");
  }
  const model = typeof value.model === "string" && /^[A-Za-z0-9._:/-]{1,120}$/.test(value.model)
    ? value.model
    : undefined;
  return { choices: [{ message: { content: value.output } }], model };
}

export function ownerAiProviderConfigured(
  source: NodeJS.ProcessEnv = process.env,
): boolean {
  try {
    if (ownerAiProvider(source) === "openclaw-broker") brokerConfiguration(source);
    else openAiProviderConfiguration(source);
    return true;
  } catch {
    return false;
  }
}

export function ownerAiProviderName(
  source: NodeJS.ProcessEnv = process.env,
): OwnerAiProvider {
  // Audit metadata must remain available in development so the existing
  // deterministic fallback can report a provider configuration failure.
  return source.OWNER_AI_BACKEND?.trim() === "openclaw-broker"
    ? "openclaw-broker"
    : "openai-compatible";
}

async function createOpenAiCompletion(
  messages: OwnerAiChatMessage[],
  environment: NodeJS.ProcessEnv,
  fetchImpl: FetchLike,
) {
  const { baseUrl, apiKey, model } = openAiProviderConfiguration(environment);
  const configuredTimeout = Number(environment.OWNER_AI_TIMEOUT_MS ?? "45000");
  const timeoutMs = Number.isFinite(configuredTimeout)
    ? Math.min(Math.max(Math.trunc(configuredTimeout), 5_000), 120_000)
    : 45_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream: false, max_tokens: 4_096 }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`OWNER_AI_PROVIDER_HTTP_${response.status}`);
    return await readBoundedJson(response) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OWNER_AI_PROVIDER_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function createBrokerCompletion(
  messages: OwnerAiChatMessage[],
  context: OwnerAiInvocationContext | undefined,
  environment: NodeJS.ProcessEnv,
  fetchImpl: FetchLike,
) {
  if (!context || !validRequestId(context.requestId) || !validRequestId(context.correlationId)) {
    throw new Error("OWNER_AI_BROKER_CONTEXT_REQUIRED");
  }
  const { endpoint, token, hmacKey } = brokerConfiguration(environment);
  const configuredTimeout = Number(environment.OWNER_AI_TIMEOUT_MS ?? "45000");
  const timeoutMs = Number.isFinite(configuredTimeout)
    ? Math.min(Math.max(Math.trunc(configuredTimeout), 5_000), 120_000)
    : 45_000;
  const body = JSON.stringify({
    protocol: "haydevos-openclaw-broker/v1",
    requestId: context.requestId,
    context,
    messages,
    // The broker's OpenClaw agent is reasoning-only. HayDevOS remains the
    // domain-tool and approval executor; no Gateway tool config is accepted.
    capabilities: { domainTools: false, shell: false, browser: false, filesystem: false },
  });
  const timestamp = String(Date.now());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-HayDev-Broker-Protocol": "v1",
        "X-HayDev-Timestamp": timestamp,
        "X-HayDev-Request-ID": context.requestId,
        "X-HayDev-Signature": signedValue(hmacKey, `${timestamp}.${context.requestId}.${body}`),
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`OWNER_AI_BROKER_HTTP_${response.status}`);
    const responseBody = await readBoundedText(response);
    const responseTimestamp = response.headers.get("x-haydev-timestamp");
    const timestampMs = Number(responseTimestamp);
    if (!Number.isSafeInteger(timestampMs) || Math.abs(Date.now() - timestampMs) > BROKER_SIGNATURE_MAX_AGE_MS) {
      throw new Error("OWNER_AI_BROKER_INVALID_SIGNATURE");
    }
    const expectedSignature = signedValue(hmacKey, `${responseTimestamp}.${context.requestId}.${responseBody}`);
    if (!equalSignature(expectedSignature, response.headers.get("x-haydev-signature"))) {
      throw new Error("OWNER_AI_BROKER_INVALID_SIGNATURE");
    }
    try {
      return parseBrokerCompletion(JSON.parse(responseBody), context.requestId);
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error("OWNER_AI_BROKER_INVALID_RESPONSE");
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OWNER_AI_BROKER_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function createOwnerAiCompletion(
  messages: OwnerAiChatMessage[],
  options: {
    environment?: NodeJS.ProcessEnv;
    fetchImpl?: FetchLike;
    context?: OwnerAiInvocationContext;
  } = {},
) {
  const environment = options.environment ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  return ownerAiProvider(environment) === "openclaw-broker"
    ? createBrokerCompletion(messages, options.context, environment, fetchImpl)
    : createOpenAiCompletion(messages, environment, fetchImpl);
}
