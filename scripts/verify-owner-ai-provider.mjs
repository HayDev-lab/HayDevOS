import "dotenv/config";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const baseUrl = required("OWNER_AI_BASE_URL").replace(/\/$/, "");
const apiKey = required("OWNER_AI_API_KEY");
const model = required("OWNER_AI_MODEL");
const timeoutMs = Math.min(Math.max(Number(process.env.OWNER_AI_TIMEOUT_MS ?? 60_000), 5_000), 120_000);
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

try {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_tokens: 256,
      stream: false,
    }),
    signal: controller.signal,
  });
  if (!response.ok) {
    throw new Error(`Owner AI provider returned HTTP ${response.status}`);
  }
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    const firstChoice = payload?.choices?.[0];
    throw new Error(`Owner AI provider returned no completion content: ${JSON.stringify({
      payloadKeys: Object.keys(payload ?? {}).sort(),
      choiceCount: Array.isArray(payload?.choices) ? payload.choices.length : 0,
      choiceKeys: Object.keys(firstChoice ?? {}).sort(),
      messageKeys: Object.keys(firstChoice?.message ?? {}).sort(),
      finishReason: firstChoice?.finish_reason ?? null,
    })}`);
  }
  console.log(JSON.stringify({ status: "ok", provider: new URL(baseUrl).host, model: payload.model ?? model }));
} finally {
  clearTimeout(timer);
}
