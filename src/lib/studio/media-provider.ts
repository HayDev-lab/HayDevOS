import "server-only";
import { z } from "zod";
import type { AuthContext } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/errors";
import { boundedBytes, STUDIO_UPLOAD_LIMIT } from "./upload";

import { transcriptionResult } from "./subtitles";
export const mediaKinds = ["video", "audio", "voice", "image", "avatar"] as const;
export const generationSchema = z.object({
  kind: z.enum(mediaKinds), prompt: z.string().trim().min(3).max(8000),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  durationSec: z.coerce.number().int().min(1).max(120).default(5),
  voice: z.enum(["alloy", "nova", "shimmer", "coral", "echo", "onyx"]).default("coral"),
}).strict();
export type GenerationInput = z.infer<typeof generationSchema>;
type Environment = Record<string, string | undefined>;
type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
function trustedEndpoint(raw: string, env: Environment): string {
  let url: URL;
  try { url = new URL(raw); } catch { throw new ApiError(503, "STUDIO_PROVIDER_NOT_CONFIGURED", "Studio provider URL is invalid"); }
  if (url.username || url.password || url.search || url.hash || !["http:", "https:"].includes(url.protocol) || (url.protocol !== "https:" && !(env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) throw new ApiError(503, "STUDIO_PROVIDER_NOT_CONFIGURED", "Studio provider URL is invalid");
  return url.toString().replace(/\/$/, "");
}
function aiConfiguration(env: Environment) {
  const key = env.STUDIO_AI_API_KEY?.trim() || env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return { key, base: trustedEndpoint(env.STUDIO_AI_BASE_URL || "https://api.openai.com/v1", env) };
}
function gatewayConfiguration(env: Environment) {
  if (!env.STUDIO_MEDIA_GATEWAY_URL || !env.STUDIO_MEDIA_GATEWAY_KEY) return null;
  return { key: env.STUDIO_MEDIA_GATEWAY_KEY, url: trustedEndpoint(env.STUDIO_MEDIA_GATEWAY_URL, env) };
}
export function studioCapabilities(env: Environment = process.env) {
  const ai = aiConfiguration(env), gateway = gatewayConfiguration(env);
  const configuredKinds = (env.STUDIO_MEDIA_GATEWAY_KINDS || mediaKinds.join(",")).split(",").map((v) => v.trim());
  return { generation: mediaKinds.filter((kind) => (gateway && configuredKinds.includes(kind)) || (ai && ["voice", "image", "avatar"].includes(kind))), transcription: Boolean(ai), promptEditing: true };
}
async function providerResponse(response: Response) {
  if (!response.ok) { await response.body?.cancel(); throw new ApiError(response.status === 429 ? 429 : 502, "STUDIO_PROVIDER_UNAVAILABLE", "Studio media provider rejected the request"); }
  return response;
}
async function boundedJson(response: Response) {
  try { return JSON.parse(new TextDecoder().decode(await boundedBytes(response, 24 * 1024 * 1024))); }
  catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(502, "STUDIO_PROVIDER_INVALID_RESPONSE", "Invalid studio provider response"); }
}
function checkReference(reference?: File) {
  if (reference && (!["image/png", "image/jpeg", "image/webp"].includes(reference.type) || reference.size < 1 || reference.size > STUDIO_UPLOAD_LIMIT)) throw new ApiError(422, "STUDIO_FILE_INVALID", "Use a PNG, JPEG or WebP reference");
}
function validMedia(bytes: Uint8Array, kind: GenerationInput["kind"], mime: string) {
  const expected = kind === "voice" || kind === "audio" ? "audio/" : kind === "video" ? "video/" : "image/";
  if (!mime.startsWith(expected) || !bytes.length || mime === "image/svg+xml" || mime === "text/html") throw new ApiError(502, "STUDIO_PROVIDER_INVALID_RESPONSE", "Provider returned unsupported media");
  const head = new TextDecoder().decode(bytes.slice(0, 64)).trimStart();
  if (/^(?:<!doctype|<html|<script|\{)/i.test(head)) throw new ApiError(502, "STUDIO_PROVIDER_INVALID_RESPONSE", "Provider returned invalid media");
}
export async function generateStudioMedia(context: AuthContext, input: GenerationInput, reference?: File, env: Environment = process.env, fetchImpl: Fetch = fetch) {
  checkReference(reference);
  if (!studioCapabilities(env).generation.includes(input.kind)) throw new ApiError(503, "STUDIO_PROVIDER_NOT_CONFIGURED", "A media provider must be connected for this content type");
  const ai = aiConfiguration(env), gateway = gatewayConfiguration(env);
  const gatewayKinds = (env.STUDIO_MEDIA_GATEWAY_KINDS || mediaKinds.join(",")).split(",").map((v) => v.trim());
  const signal = AbortSignal.timeout(110000);
  let bytes: Uint8Array<ArrayBuffer>, mime: string;
  if (gateway && gatewayKinds.includes(input.kind)) {
    const form = new FormData();
    Object.entries(input).forEach(([key, value]) => form.set(key, String(value)));
    if (reference) form.set("reference", reference);
    const response = await providerResponse(await fetchImpl(gateway.url, { method: "POST", headers: { Authorization: "Bearer " + gateway.key, "X-HayDev-Organization": context.orgId, "X-HayDev-Actor": context.userId }, body: form, signal, redirect: "error" }));
    mime = response.headers.get("content-type")?.split(";")[0] ?? "";
    bytes = await boundedBytes(response, 40 * 1024 * 1024);
  } else if (input.kind === "voice" && ai) {
    const response = await providerResponse(await fetchImpl(ai.base + "/audio/speech", { method: "POST", headers: { Authorization: "Bearer " + ai.key, "Content-Type": "application/json" }, body: JSON.stringify({ model: env.STUDIO_VOICE_MODEL || "gpt-4o-mini-tts", input: input.prompt, voice: input.voice, response_format: "mp3" }), signal, redirect: "error" }));
    bytes = await boundedBytes(response, 12 * 1024 * 1024); mime = "audio/mpeg";
  } else if (ai) {
    if (input.kind === "avatar" && !reference) throw new ApiError(422, "STUDIO_REFERENCE_REQUIRED", "An avatar requires a reference photo");
    const model = env.STUDIO_IMAGE_MODEL || "gpt-image-1";
    const size = input.aspectRatio === "9:16" ? "1024x1536" : input.aspectRatio === "16:9" ? "1536x1024" : "1024x1024";
    let body: BodyInit, headers: Record<string, string> = { Authorization: "Bearer " + ai.key };
    if (reference) {
      const form = new FormData(); form.set("model", model); form.set("prompt", input.prompt); form.set("size", size); form.set("quality", "medium"); form.set("image", reference);
      body = form;
    } else { headers = { ...headers, "Content-Type": "application/json" }; body = JSON.stringify({ model, prompt: input.prompt, size, quality: "medium", n: 1 }); }
    const response = await providerResponse(await fetchImpl(ai.base + (reference ? "/images/edits" : "/images/generations"), { method: "POST", headers, body, signal, redirect: "error" }));
    const data = await boundedJson(response), encoded = data?.data?.[0]?.b64_json;
    if (typeof encoded !== "string" || encoded.length > 32 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new ApiError(502, "STUDIO_PROVIDER_INVALID_RESPONSE", "Provider must return a base64 image");
    bytes = new Uint8Array(Buffer.from(encoded, "base64")); mime = "image/png";
  } else throw new ApiError(503, "STUDIO_PROVIDER_NOT_CONFIGURED", "Studio provider is missing");
  validMedia(bytes, input.kind, mime);
  return { bytes, mime, kind: input.kind };
}
export async function transcribeStudioMedia(file: File, language: string, env: Environment = process.env, fetchImpl: Fetch = fetch) {
  const ai = aiConfiguration(env);
  if (!ai) throw new ApiError(503, "STUDIO_PROVIDER_NOT_CONFIGURED", "A speech provider must be connected");
  if ((!file.type.startsWith("audio/") && !file.type.startsWith("video/")) || !file.size || file.size > STUDIO_UPLOAD_LIMIT) throw new ApiError(422, "STUDIO_FILE_INVALID", "Unsupported speech source");
  const form = new FormData(); form.set("file", file); form.set("model", env.STUDIO_TRANSCRIPTION_MODEL || "whisper-1"); form.set("response_format", "verbose_json"); form.set("timestamp_granularities[]", "segment");
  if (["hy", "ru", "en"].includes(language)) form.set("language", language);
  const response = await providerResponse(await fetchImpl(ai.base + "/audio/transcriptions", { method: "POST", headers: { Authorization: "Bearer " + ai.key }, body: form, signal: AbortSignal.timeout(110000), redirect: "error" }));
  try { return transcriptionResult(await boundedJson(response)); }
  catch { throw new ApiError(502, "STUDIO_TRANSCRIPT_EMPTY", "Provider returned no usable transcript"); }
}
