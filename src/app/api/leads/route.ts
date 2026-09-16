import { getTranslator, isLocale } from "@/lib/i18n";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * Port of the original Cloudflare D1 `/api/leads` endpoint to Prisma + SQLite.
 * Validation, UUID idempotency and the per-contact daily limit are preserved;
 * the strict same-origin check is relaxed to work behind the sandbox gateway
 * (origin host is compared against the forwarded host when present).
 */

const leadSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  message: z.string().trim().max(3000).default(""),
  website: z.string().max(0).default(""),
  consent: z.literal(true),
});

const MAX_BODY = 16000;
const DAILY_LIMIT = 3;
const DAY_MS = 86_400_000;

function json(data: unknown, status: number) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function POST(request: Request) {
  const requestedLocale = request.headers.get("X-Haydev-Locale");
  const t = getTranslator(isLocale(requestedLocale) ? requestedLocale : "hy");

  // Same-origin enforcement (gateway-aware): allow missing origin (e.g. curl),
  // reject clear cross-site submissions.
  const origin = request.headers.get("origin");
  if (origin) {
    const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    try {
      if (forwardedHost && new URL(origin).host !== forwardedHost) {
        return json({ error: t("Отправьте заявку через форму на сайте.") }, 403);
      }
    } catch {
      return json({ error: t("Отправьте заявку через форму на сайте.") }, 403);
    }
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return json({ error: t("Неподдерживаемый формат запроса.") }, 415);
  }
  if (Number(request.headers.get("content-length")) > MAX_BODY) {
    return json({ error: t("Описание слишком длинное.") }, 413);
  }

  let payload: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: t("Заполните форму.") }, 400);
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BODY) {
        await reader.cancel();
        return json({ error: t("Описание слишком длинное.") }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return json({ error: t("Не удалось прочитать заявку.") }, 400);
  }

  const parsed = leadSchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: t("Проверьте имя, почту и согласие на обработку заявки.") }, 400);
  }
  const { requestId, name, email, message } = parsed.data;

  try {
    // Idempotent retries after a network interruption never duplicate a lead.
    const existing = await db.lead.findUnique({ where: { id: requestId }, select: { id: true } });
    if (existing) return json({ accepted: true }, 200);

    const recent = await db.lead.count({
      where: { email, createdAt: { gt: new Date(Date.now() - DAY_MS) } },
    });
    if (recent >= DAILY_LIMIT) {
      return json({ error: t("С этой почты уже отправлено несколько заявок. Повторите попытку завтра.") }, 429);
    }

    await db.lead.create({
      data: {
        id: requestId,
        name,
        email,
        message,
        consentVersion: "inquiry-only-preview-v1",
      },
    });

    // Optional notifications: when LEADS_WEBHOOK_URL is configured (e.g. a
    // Zapier / Make / n8n / Slack-incoming-webhook endpoint), forward the lead
    // fire-and-forget. Failures never affect the visitor — the row is already
    // stored and the UI shows success.
    const webhook = process.env.LEADS_WEBHOOK_URL;
    if (webhook) {
      try {
        await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "haydev-site", requestId, name, email, message, locale: requestedLocale ?? "ru" }),
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        // Notification is best-effort; never block or reveal the lead result.
      }
    }
    return json({ accepted: true }, 201);
  } catch (error) {
    // A duplicate insert from a retried request is a success, not an error.
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return json({ accepted: true }, 200);
    }
    // Do not expose storage internals or log personal information.
    console.error("HayDev lead persistence failed");
    return json({ error: t("Не удалось сохранить заявку. Данные остались в форме — попробуйте позже.") }, 503);
  }
}
