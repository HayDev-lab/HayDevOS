"use client";
import { useLanguage } from "@/components/language-provider";
import { useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { projectTypes } from "@/data/business-os";

function createRequestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // getRandomValues also works in the HTTP-only local preview.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function ContactForm({ onPrivacy, message, onMessageChange, auditAttached }: { onPrivacy: () => void; message: string; onMessageChange: (value: string) => void; auditAttached: boolean }) {
  const { t, locale } = useLanguage();
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [types, setTypes] = useState<string[]>([]);
  const requestId = useRef<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  function toggleType(type: string) {
    setTypes(current => current.includes(type) ? current.filter(x => x !== type) : [...current, type]);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    if (!consent) { setError(t("Подтвердите согласие на обработку заявки.")); setStatus("error"); return; }
    const data = new FormData(event.currentTarget);
    requestId.current ??= createRequestId();
    setStatus("sending"); setError("");
    // Selected project types qualify the lead before the first call.
    const typePrefix = types.length > 0 ? `${t("Тип проекта")}: ${types.map(x => t(x)).join(", ")}\n\n` : "";
    try {
      const response = await fetch("/api/leads", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Haydev-Locale": locale },
        body: JSON.stringify({ requestId: requestId.current, name: data.get("name"), email: data.get("email"), message: typePrefix + data.get("message"), website: data.get("website"), consent }),
        signal: AbortSignal.timeout(20000),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string" ? result.error : t("Не удалось сохранить заявку. Попробуйте ещё раз.");
        throw new Error(message);
      }
      setStatus("success"); requestAnimationFrame(() => resultRef.current?.focus());
      // The draft lived only until submission — clear the stored message.
      onMessageChange("");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error && cause.name !== "TimeoutError" && cause.name !== "TypeError" ? cause.message : t("Связь прервалась. Данные остались в форме — попробуйте отправить ещё раз."));
    }
  }
  if (status === "success") return <div className="form-success" tabIndex={-1} ref={resultRef} role="status"><span className="success-icon"><Check size={30} /></span><span className="eyebrow">{t("ЗАЯВКА ПРИНЯТА")}</span><h3>{t("Первый шаг сделан.")}</h3><p>{t("Ваш запрос сохранён. Следующий шаг — обсудить задачу и формат работы по указанной почте.")}</p><Button className="button button-outline" onClick={() => { requestId.current = null; setConsent(false); setStatus("idle"); }}>{t("Новая заявка")} <ArrowUpRight size={18} /></Button></div>;
  return <form className="contact-form" onSubmit={submit} onInvalid={(event) => { const field = event.target as HTMLInputElement; field.setCustomValidity(t(field.name === "email" ? "Укажите корректную электронную почту." : "Введите имя (не менее двух символов).")); }} onInput={(event) => { const field = event.target as HTMLInputElement; field.setCustomValidity?.(""); }} aria-label={t("Заявка на обсуждение проекта")}>{auditAttached && <p className="audit-attached">{t("Ответы аудита добавлены в описание. Можно отредактировать перед отправкой.")}</p>}<fieldset className="project-types"><legend className="eyebrow">{t("ЧТО СОЗДАЁМ?")}</legend><div className="project-types-list" role="group" aria-label={t("Тип проекта")}>{projectTypes.map(type => <button type="button" key={type} className="project-type-chip" aria-pressed={types.includes(type)} onClick={() => toggleType(type)}>{t(type)}</button>)}</div></fieldset><div className="field-row"><label>{t("Как вас зовут")} <span aria-hidden="true">*</span><Input name="name" autoComplete="name" placeholder={t("Ваше имя")} required minLength={2} maxLength={100} disabled={status === "sending"} /></label><label>{t("Электронная почта")} <span aria-hidden="true">*</span><Input name="email" type="email" autoComplete="email" placeholder="you@company.com" required maxLength={254} disabled={status === "sending"} /></label></div><label>{t("Что хотите создать?")}<Textarea value={message} onChange={e=>onMessageChange(e.target.value)} name="message" placeholder={t("Расскажите о идее или задаче — можно в двух словах")} maxLength={3000} rows={4} disabled={status === "sending"} /><span className="char-counter" aria-hidden="true">{message.length} / 3000</span></label><div className="honeypot" aria-hidden="true"><label>Website<Input name="website" autoComplete="off" tabIndex={-1} /></label></div><div className="consent-row"><Checkbox id="lead-consent" checked={consent} onCheckedChange={(value) => setConsent(value === true)} disabled={status === "sending"} /><label htmlFor="lead-consent">{t("Согласен на обработку данных для ответа на заявку.")}</label></div><button type="button" className="privacy-inline" onClick={onPrivacy}>{t("Как используются данные")}</button><p id="form-error" role="alert" className="form-error">{error}</p><Button type="submit" className="button button-primary submit-button" disabled={status === "sending"} aria-describedby={error ? "form-error" : undefined}>{status === "sending" ? <>{t("Сохраняем заявку")} <LoaderCircle className="spinner" size={18} /></> : <>{t("Обсудить проект")} <ArrowUpRight size={20} /></>}</Button><p className="form-note">{t("Без готового ТЗ тоже можно. Начнём с вашей задачи.")}</p></form>;
}
