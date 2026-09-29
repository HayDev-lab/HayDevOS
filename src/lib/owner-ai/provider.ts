import "server-only";

import { ApiError } from "@/lib/api/errors";

export type OwnerAiChatMessage = {
  role: "system" | "assistant" | "user";
  content: string;
};

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const MAX_PROVIDER_RESPONSE_BYTES = 1024 * 1024;

async function readBoundedJson(response: Response): Promise<unknown> {
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
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("OWNER_AI_PROVIDER_INVALID_RESPONSE");
  }
}

export function ownerAiDemoEnabled(
  source: NodeJS.ProcessEnv = process.env,
): boolean {
  return source.NODE_ENV !== "production" && source.HAYDEV_ALLOW_DEMO_DATA === "true";
}

function providerConfiguration(source: NodeJS.ProcessEnv): {
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

export function ownerAiProviderConfigured(
  source: NodeJS.ProcessEnv = process.env,
): boolean {
  try {
    providerConfiguration(source);
    return true;
  } catch {
    return false;
  }
}

export async function createOwnerAiCompletion(
  messages: OwnerAiChatMessage[],
  options: {
    environment?: NodeJS.ProcessEnv;
    fetchImpl?: FetchLike;
  } = {},
) {
  const environment = options.environment ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const { baseUrl, apiKey, model } = providerConfiguration(environment);
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
