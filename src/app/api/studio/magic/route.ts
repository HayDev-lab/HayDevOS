import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { type MagicAssetKind, type MagicAssetSummary, type MagicRequest } from "@/lib/studio/magic";
import { createMagicPlan } from "@/lib/studio/magic-service";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 60 * 1024 * 1024;
const assetKinds = ["reference", "firstFrame", "lastFrame", "music", "voice", "sound"] as const;
const assetKindSchema = z.enum(assetKinds);
const characterSchema = z.object({
  name: z.string().trim().max(120),
  description: z.string().trim().max(1_000),
  locked: z.boolean(),
}).strict();
const assetSummarySchema = z.object({
  kind: assetKindSchema,
  name: z.string().trim().min(1).max(240),
  type: z.string().trim().max(120),
  size: z.number().int().nonnegative().max(MAX_FILE_BYTES),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
const magicJsonSchema = z.object({
  prompt: z.string().trim().min(3).max(12_000),
  durationSec: z.number().int().min(1).max(600),
  language: z.string().trim().min(1).max(80),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]),
  assets: z.array(assetSummarySchema).max(assetKinds.length),
  characters: z.array(characterSchema).max(3),
}).strict();

const fileFields: Array<{ field: string; kind: MagicAssetKind }> = [
  { field: "reference", kind: "reference" }, { field: "firstFrame", kind: "firstFrame" }, { field: "lastFrame", kind: "lastFrame" },
  { field: "music", kind: "music" }, { field: "voice", kind: "voice" }, { field: "sound", kind: "sound" },
];

function isAllowedFile(kind: MagicAssetKind, file: File): boolean {
  if (kind === "reference" || kind === "firstFrame" || kind === "lastFrame") return file.type.startsWith("image/") || (kind !== "reference" && file.type.startsWith("video/"));
  return file.type.startsWith("audio/");
}

async function summarizeFile(kind: MagicAssetKind, file: File) {
  if (!file.name || file.size <= 0 || file.size > MAX_FILE_BYTES || !isAllowedFile(kind, file)) return null;
  const bytes = Buffer.from(await file.arrayBuffer());
  return { kind, name: file.name, type: file.type, size: file.size, sha256: createHash("sha256").update(bytes).digest("hex") };
}

async function parseMagicRequest(req: NextRequest): Promise<MagicRequest> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return magicJsonSchema.parse(await parseJson(req, magicJsonSchema, 256 * 1024));
  if (!contentType.includes("multipart/form-data")) throw new Error("MAGIC_MULTIPART_REQUIRED");
  const form = await req.formData();
  const prompt = String(form.get("prompt") ?? "").trim();
  const durationSec = Number(form.get("durationSec") ?? 120);
  const language = String(form.get("language") ?? "Русский").trim();
  const aspectRatio = String(form.get("aspectRatio") ?? "16:9") as MagicRequest["aspectRatio"];
  const rawCharacters = String(form.get("characters") ?? "[]");
  let characters: unknown;
  try { characters = JSON.parse(rawCharacters); } catch { throw new Error("MAGIC_CHARACTERS_INVALID"); }
  const parsed = magicJsonSchema.shape.characters.parse(characters);
  const assets: MagicAssetSummary[] = [];
  let totalBytes = 0;
  for (const { field, kind } of fileFields) {
    const value = form.get(field);
    if (!(value instanceof File) || value.size === 0) continue;
    totalBytes += value.size;
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error("MAGIC_UPLOAD_TOO_LARGE");
    const summary = await summarizeFile(kind, value);
    if (!summary) throw new Error("MAGIC_FILE_NOT_SUPPORTED");
    assets.push(summary);
  }
  return magicJsonSchema.parse({ prompt, durationSec, language, aspectRatio, assets, characters: parsed });
}

export async function POST(req: NextRequest) {
  return withTenantApi(req, {
    mutation: true,
    rateLimit: { scope: "studio-magic", limit: 20, windowMs: 10 * 60_000 },
  }, async (context) => {
    let input: MagicRequest;
    try {
      input = await parseMagicRequest(req);
    } catch (error) {
      const message = error instanceof Error ? error.message : "MAGIC_REQUEST_INVALID";
      return NextResponse.json({ error: message.startsWith("MAGIC_") ? message : "MAGIC_REQUEST_INVALID" }, { status: 422 });
    }
    return NextResponse.json(await createMagicPlan(context, input));
  });
}
