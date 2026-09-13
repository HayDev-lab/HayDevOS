import { getTranslator, isLocale } from "@/lib/i18n";
import { z } from "zod";
import { leadsDatabase } from "@/lib/leads-db";

const leadSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  message: z.string().trim().max(3000).default(""),
  website: z.string().max(0).default(""),
  consent: z.literal(true),
}).strict();
const MAX_BODY = 16000;
function json(data: unknown, status: number) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
export async function POST(request: Request) {
  const requestedLocale = request.headers.get("X-Haydev-Locale");
  const t = getTranslator(isLocale(requestedLocale) ? requestedLocale : "hy");
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return json({ error: t("Отправьте заявку через форму на сайте.") }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: t("Неподдерживаемый формат запроса.") }, 415);
  if (Number(request.headers.get("content-length")) > MAX_BODY) return json({ error: t("Описание слишком длинное.") }, 413);
  let payload: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: t("Заполните форму.") }, 400);
    const chunks: Uint8Array[] = []; let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BODY) { await reader.cancel(); return json({ error: t("Описание слишком длинное.") }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return json({ error: t("Не удалось прочитать заявку.") }, 400); }
  const parsed = leadSchema.safeParse(payload);
  if (!parsed.success) return json({ error: t("Проверьте имя, почту и согласие на обработку заявки.") }, 400);
  const { requestId, name, email, message } = parsed.data;
  try {
    const db = leadsDatabase();
    // Idempotent retries after a network interruption never duplicate a lead.
    const existing = await db.prepare("SELECT id FROM leads WHERE id = ?").bind(requestId).first();
    if (existing) return json({ accepted: true }, 200);
    const now = Date.now();
    // One conditional INSERT enforces the per-contact daily limit atomically.
    const result = await db.prepare("INSERT INTO leads (id, name, email, message, consent_version, created_at) SELECT ?, ?, ?, ?, ?, ? WHERE (SELECT count(*) FROM leads WHERE email = ? AND created_at > ?) < 3 ON CONFLICT(id) DO NOTHING")
      .bind(requestId, name, email, message, "inquiry-only-preview-v1", now, email, now - 86400000).run();
    if (!result.meta.changes) {
      const retry = await db.prepare("SELECT id FROM leads WHERE id = ?").bind(requestId).first();
      if (retry) return json({ accepted: true }, 200);
      return json({ error: t("С этой почты уже отправлено несколько заявок. Повторите попытку завтра.") }, 429);
    }
    return json({ accepted: true }, 201);
  } catch {
    // Do not expose storage internals or log personal information.
    console.error("HayDev lead persistence failed");
    return json({ error: t("Не удалось сохранить заявку. Данные остались в форме — попробуйте позже.") }, 503);
  }
}
