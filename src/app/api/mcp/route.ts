import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { withTenantApi } from "@/lib/api/handler";
import { createMagicPlan } from "@/lib/studio/magic-service";
import type { MagicAssetKind, MagicRequest } from "@/lib/studio/magic";
import { workspaceHref } from "@/lib/workspace-routes";

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
  preferences: z.object({
    videoStyle: z.string().trim().max(160).optional(), videoTone: z.string().trim().max(160).optional(),
    musicStyle: z.string().trim().max(160).optional(), musicTone: z.string().trim().max(160).optional(), soundStyle: z.string().trim().max(160).optional(),
    voiceStyle: z.string().trim().max(160).optional(), voiceTone: z.string().trim().max(160).optional(),
    imageStyle: z.string().trim().max(160).optional(), imageTone: z.string().trim().max(160).optional(),
    avatarStyle: z.string().trim().max(160).optional(), avatarTone: z.string().trim().max(160).optional(),
  }).strict().optional(),
  assets: z.array(inlineAssetSchema).max(6).default([]),
  characters: z.array(z.object({ name: z.string().trim().max(120), description: z.string().trim().max(1_000), locked: z.boolean() }).strict()).max(3).default([]),
}).strict();
const workspaceArgsSchema = z.object({
  module: z.string().trim().min(1).max(40),
  section: z.string().trim().min(1).max(60).optional(),
}).strict();
const webSearchArgsSchema = z.object({
  query: z.string().trim().min(2).max(240),
  provider: z.enum(["google", "bing", "duckduckgo"]).default("google"),
}).strict();

const MCP_HEADERS = { "MCP-Protocol-Version": "2025-11-25", "Cache-Control": "no-store" };

function response(id: string | number | null | undefined, result: unknown, status = 200) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result }, { status, headers: MCP_HEADERS });
}

function errorResponse(id: string | number | null | undefined, code: number, message: string, status = 200) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status, headers: MCP_HEADERS });
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

const magicToolDefinition = {
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
      preferences: { type: "object", additionalProperties: false, description: "Optional selected styles/tones. Omit for prompt-only generation." },
      assets: { type: "array", maxItems: 6, description: "Inline base64 assets: reference, firstFrame, lastFrame, music, voice, or sound." },
      characters: { type: "array", maxItems: 3, description: "Character name, description, and locked boolean." },
    },
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
};

const workspaceToolDefinition = {
  name: "haydevos_workspace_open",
  description: "Resolve an allowlisted HayDevOS module/section to a browser route. Arbitrary paths are rejected.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["module"],
    properties: {
      module: { type: "string", description: "Known module id, for example marketing, ownerAi, leados, erphub, docsmart, autopilot, connect, audit, or settings." },
      section: { type: "string", description: "Known section within the selected module." },
    },
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
};

const webSearchToolDefinition = {
  name: "haydevos_web_search",
  description: "Prepare a bounded public search URL for an explicit user query. This tool does not claim search results; use OpenClaw web_search when configured.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["query"],
    properties: {
      query: { type: "string", minLength: 2, maxLength: 240 },
      provider: { type: "string", enum: ["google", "bing", "duckduckgo"], default: "google" },
    },
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
};

const toolDefinitions = [magicToolDefinition, workspaceToolDefinition, webSearchToolDefinition];

export async function POST(req: NextRequest) {
  return withTenantApi(req, {
    mutation: true,
    originCheck: false,
    allowBearerAuth: true,
    rateLimit: { scope: "studio-mcp", limit: 30, windowMs: 10 * 60_000 },
  }, async (context) => {
    const declaredLength = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > 16 * 1024 * 1024) {
      return errorResponse(null, -32600, "Request body exceeds the 16 MB MCP limit", 413);
    }

    let request: z.infer<typeof jsonRpcSchema>;
    try { request = jsonRpcSchema.parse(await req.json()); } catch { return errorResponse(null, -32700, "Invalid JSON-RPC request", 400); }
    if (request.method === "notifications/initialized") return new NextResponse(null, { status: 202, headers: MCP_HEADERS });
    if (request.method === "ping") return response(request.id, {});
    if (request.method === "initialize") {
      return response(request.id, { protocolVersion: "2025-11-25", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "haydevos-mcp-server", version: "1.0.0" } });
    }
    if (request.method === "tools/list") return response(request.id, { tools: toolDefinitions });
    if (request.method !== "tools/call") return errorResponse(request.id, -32601, `Method not found: ${request.method}`);

    const params = request.params ?? {};
    const name = typeof params.name === "string" ? params.name : "";
    if (!toolDefinitions.some((tool) => tool.name === name)) return errorResponse(request.id, -32602, "Unknown tool");
    try {
      if (name === workspaceToolDefinition.name) {
        const input = workspaceArgsSchema.parse(params.arguments ?? {});
        const href = workspaceHref(input.module, input.section);
        const result = { href };
        return response(request.id, { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result, isError: false });
      }
      if (name === webSearchToolDefinition.name) {
        const input = webSearchArgsSchema.parse(params.arguments ?? {});
        const hosts = { google: "https://www.google.com/search", bing: "https://www.bing.com/search", duckduckgo: "https://duckduckgo.com/" } as const;
        const result = { provider: input.provider, query: input.query, url: `${hosts[input.provider]}?q=${encodeURIComponent(input.query)}`, verified: false };
        return response(request.id, { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result, isError: false });
      }
      const input = magicArgsSchema.parse(params.arguments ?? {});
      const magicInput: MagicRequest = {
        prompt: input.prompt,
        durationSec: input.durationSec,
        language: input.language,
        aspectRatio: input.aspectRatio,
        preferences: input.preferences,
        assets: input.assets.map(validateInlineAsset),
        characters: input.characters,
      };
      const result = await createMagicPlan(context, magicInput);
      return response(request.id, { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result, isError: false });
    } catch (error) {
      return errorResponse(request.id, -32602, error instanceof Error ? error.message : "Invalid tool arguments");
    }
  });
}
