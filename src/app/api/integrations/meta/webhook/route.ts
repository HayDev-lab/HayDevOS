import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { findMetaIntegrationByExternalId, metaWebhookVerifyToken, verifyMetaWebhookSignature } from "@/lib/integrations/meta";

const MAX_META_WEBHOOK_BYTES = 1_000_000;

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  try {
    if (mode === "subscribe" && token === metaWebhookVerifyToken() && challenge) return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch {
    return NextResponse.json({ error: "META_WEBHOOK_NOT_CONFIGURED" }, { status: 503 });
  }
  return NextResponse.json({ error: "META_WEBHOOK_VERIFICATION_FAILED" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_META_WEBHOOK_BYTES) return NextResponse.json({ error: "META_WEBHOOK_TOO_LARGE" }, { status: 413 });
  const body = await req.text();
  if (Buffer.byteLength(body, "utf8") > MAX_META_WEBHOOK_BYTES) return NextResponse.json({ error: "META_WEBHOOK_TOO_LARGE" }, { status: 413 });
  let valid = false;
  try { valid = verifyMetaWebhookSignature(body, req.headers.get("x-hub-signature-256")); } catch { return NextResponse.json({ error: "META_WEBHOOK_NOT_CONFIGURED" }, { status: 503 }); }
  if (!valid) return NextResponse.json({ error: "META_WEBHOOK_SIGNATURE_INVALID" }, { status: 401 });
  let payload: { object?: string; entry?: Array<{ id?: string; changes?: Array<{ field?: string; value?: Record<string, unknown> }> }> };
  try { payload = JSON.parse(body) as typeof payload; } catch { return NextResponse.json({ error: "META_WEBHOOK_JSON_INVALID" }, { status: 400 }); }
  const externalAccountId = payload.entry?.[0]?.id;
  if (!externalAccountId) return NextResponse.json({ received: true, ignored: true });
  const integration = await findMetaIntegrationByExternalId(externalAccountId);
  if (!integration) return NextResponse.json({ received: true, ignored: true });
  const firstChange = payload.entry?.[0]?.changes?.[0];
  const messageId = firstChange?.value && typeof firstChange.value === "object" && typeof firstChange.value.id === "string" ? firstChange.value.id : null;
  const eventId = messageId || createHash("sha256").update(body, "utf8").digest("hex");
  const db = getDb();
  await db.webhookEvent.upsert({
    where: { orgId_provider_eventId: { orgId: integration.orgId, provider: integration.provider, eventId } },
    create: { orgId: integration.orgId, provider: integration.provider, eventId, payload: body, processed: false },
    update: {},
  });
  return NextResponse.json({ received: true, eventId });
}
