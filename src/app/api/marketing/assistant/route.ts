import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import {
  addMarketingAssistantKnowledge,
  getMarketingAssistantConfig,
  MARKETING_ASSISTANT_KINDS,
  MARKETING_ASSISTANT_MODES,
  removeMarketingAssistantKnowledge,
  updateMarketingAssistantConfig,
} from "@/lib/marketing-assistant/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listSchema = z.array(z.string().trim().min(1).max(500)).max(100);
const updateSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  systemPrompt: z.string().max(12_000).optional(),
  allowedTopics: listSchema.optional(),
  forbiddenTopics: listSchema.optional(),
  responseRules: listSchema.optional(),
  language: z.string().trim().min(2).max(20).optional(),
  autoReplyMode: z.enum(MARKETING_ASSISTANT_MODES).optional(),
}).strict();
const kindSchema = z.enum(MARKETING_ASSISTANT_KINDS);

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (context) =>
    NextResponse.json(await getMarketingAssistantConfig(context)));
}

export async function PUT(req: NextRequest) {
  return withTenantApi(req, {
    mutation: true,
    roles: ["OWNER", "ADMIN", "MANAGER"],
    rateLimit: { scope: "marketing-assistant-config", limit: 60, windowMs: 60_000 },
  }, async (context) => {
    const input = await parseJson(req, updateSchema, 64 * 1024);
    return NextResponse.json(await updateMarketingAssistantConfig(context, input));
  });
}

export async function POST(req: NextRequest) {
  return withTenantApi(req, {
    mutation: true,
    roles: ["OWNER", "ADMIN", "MANAGER"],
    rateLimit: { scope: "marketing-assistant-knowledge", limit: 20, windowMs: 10 * 60_000 },
  }, async (context) => {
    const contentType = req.headers.get("content-type") ?? "";
    let title = "Marketing script";
    let kind: z.infer<typeof kindSchema> = "sales_script";
    let content = "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      title = String(form.get("title") ?? title);
      kind = kindSchema.parse(String(form.get("kind") ?? kind));
      const file = form.get("file");
      if (file instanceof File) {
        if (file.size > 120_000) return NextResponse.json({ error: "ASSISTANT_KNOWLEDGE_TOO_LARGE" }, { status: 413 });
        if (file.type && !["text/plain", "text/markdown", "text/csv", "application/json"].includes(file.type)) return NextResponse.json({ error: "ASSISTANT_KNOWLEDGE_TEXT_ONLY" }, { status: 415 });
        content = await file.text();
        if (!title.trim()) title = file.name;
      } else {
        content = String(form.get("content") ?? "");
      }
    } else {
      const body = await req.json() as unknown;
      const parsed = z.object({ title: z.string().trim().min(1).max(240), kind: kindSchema, content: z.string().min(20).max(120_000) }).strict().parse(body);
      title = parsed.title;
      kind = parsed.kind;
      content = parsed.content;
    }
    return NextResponse.json(await addMarketingAssistantKnowledge(context, { title, kind, content }), { status: 201 });
  });
}

export async function DELETE(req: NextRequest) {
  return withTenantApi(req, {
    mutation: true,
    roles: ["OWNER", "ADMIN", "MANAGER"],
    rateLimit: { scope: "marketing-assistant-knowledge-delete", limit: 30, windowMs: 60_000 },
  }, async (context) => {
    const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(id)) return NextResponse.json({ error: "ASSISTANT_KNOWLEDGE_ID_INVALID" }, { status: 422 });
    await removeMarketingAssistantKnowledge(context, id);
    return NextResponse.json({ ok: true });
  });
}
