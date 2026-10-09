import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { enforceRateLimit } from "@/lib/security/rate-limit";
import { resolveSessionToken } from "@/lib/auth/session";
import { createMagicPlan } from "@/lib/studio/magic-service";
import type { MagicAssetKind, MagicRequest } from "@/lib/studio/magic";

const jsonRpcSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string().min(1).max(128), z.number().int(), z.null()]).optional(),
  method: z.string().min(1).max(80),
  params: z.record(z.string(), z.unknown()).optional(),
}).strict();
const inlineAssetSchema = z.object({
  kind: z.enum(["reference", "firstFrame", "lastFrame", "music", "voice", "sound"]),
  name: z.string().trim().min(1).max(240),
  mimeType: z.string().trim().max(120),
  dataBase64: z.string().min(4).max(12_000_000),
}).strict();
const magicArgsSchema = z.object({
  prompt: z.string().trim().min(3).max(12_000),
  durationSec: z.number().int().min(1).max(600).default(120),
  language: z.string().trim().min(1).max(80).default("Русский"),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  assets: z.array(inlineAssetSchema).max(6).default([]),
  characters: z.array(z.object({ name: z.string().trim().max(120), description: z.string().trim().max(1_000), locked: z.boolean() }).strict()).max(3).default([]),
}).strict();

const MCP_HEADERS = { "MCP-Protocol-Version": "2025-11-25", "Cache-Control": "no-store" };

function response(id: string | number | null | undefined, result: unknown, status = 200) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result }, { status, headers: MCP_HEADERS });
}

function errorResponse(id: string | number | null | undefined, code: number, message: string, status = 200) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status, headers: MCP_HEADERS });
}

function bearerToken(req: NextRequest): string | null {
  const value = req.headers.get("authorization") ?? "";
  if (!value.startsWith("Bearer ")) return null;
  const token = value.slice("Bearer ".length).trim();
  return /^[A-Za-z0-9_-]{32,128}$/.test(token) ? token : null;
}

function validateInlineAsset(asset: z.infer<typeof inlineAssetSchema>) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(asset.dataBase64)) throw new Error("inline asset encoding is invalid");
  const bytes = Buffer.from(asset.dataBase64, "base64");
  if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) throw new Error("inline asset exceeds the 8 MB MCP limit");
  const kind = asset.kind as MagicAssetKind;
  const visual = kind === "reference" || kind === "firstFrame" || kind === "lastFrame";
  const validType = visual ? asset.mimeType.startsWith("image/") || (kind !== "reference" && asset.mimeType.startsWith("video/")) : asset.mimeType.startsWith("audio/");
  if (!validType) throw new Error("inline asset MIME type does not match its slot");
  return { kind, name: asset.name, type: asset.mimeType, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}

const toolDefinition = {
  name: "haydevos_studio_magic",
  description: "Build a tenant-scoped HayDevOS Magic montage plan from a prompt, optional inline image/audio assets, and up to three locked characters. The tool never claims a render is complete when the provider is unavailable.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["prompt"],
    properties: {
      prompt: { type: "string", minLength: 3, maxLength: 12000, description: "Natural-language video brief." },
      durationSec: { type: "integer", minimum: 1, maximum: 600, default: 120 },
      language: { type: "string", default: "Русский" },
      aspectRatio: { type: "string", enum: ["16:9", "9:16", "1:1"], default: "16:9" },
      assets: { type: "array", maxItems: 6, description: "Inline base64 assets: reference, firstFrame, lastFrame, music, voice, or sound." },
      characters: { type: "array", maxItems: 3, description: "Character name, description, and locked boolean." },
    },
  },
};

export async function POST(req: NextRequest) {
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 16 * 1024 * 1024) {
    return errorResponse(null, -32600, "Request body exceeds the 16 MB MCP limit", 413);
  }
  const token = bearerToken(req);
  const context = await resolveSessionToken(token);
  if (!context) return errorResponse(null, -32001, "Authentication required", 401);
  try {
    await enforceRateLimit({ scope: "studio-mcp", limit: 30, windowMs: 10 * 60_000 }, `${context.orgId}:${context.userId}`);
  } catch {
    return errorResponse(null, -32029, "Too many requests. Try again later.", 429);
  }

  let request: z.infer<typeof jsonRpcSchema>;
  try { request = jsonRpcSchema.parse(await req.json()); } catch { return errorResponse(null, -32700, "Invalid JSON-RPC request", 400); }
  if (request.method === "notifications/initialized") return new NextResponse(null, { status: 202, headers: MCP_HEADERS });
  if (request.method === "ping") return response(request.id, {});
  if (request.method === "initialize") {
    return response(request.id, { protocolVersion: "2025-11-25", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "haydevos-mcp-server", version: "1.0.0" } });
  }
  if (request.method === "tools/list") return response(request.id, { tools: [toolDefinition] });
  if (request.method !== "tools/call") return errorResponse(request.id, -32601, `Method not found: ${request.method}`);

  const params = request.params ?? {};
  const name = typeof params.name === "string" ? params.name : "";
  if (name !== toolDefinition.name) return errorResponse(request.id, -32602, "Unknown tool");
  try {
    const input = magicArgsSchema.parse(params.arguments ?? {});
    const magicInput: MagicRequest = {
      prompt: input.prompt,
      durationSec: input.durationSec,
      language: input.language,
      aspectRatio: input.aspectRatio,
      assets: input.assets.map(validateInlineAsset),
      characters: input.characters,
    };
    const result = await createMagicPlan(context, magicInput);
    return response(request.id, { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result, isError: false });
  } catch (error) {
    return errorResponse(request.id, -32602, error instanceof Error ? error.message : "Invalid tool arguments");
  }
}
