"use client";
import { useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

function createRequestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // getRandomValues also works in the HTTP-only local preview.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function ContactForm({ onPrivacy }: { onPrivacy: () => void }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const requestId = useRef<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    if (!consent) { setError("Подтвердите согласие на обработку заявки."); setStatus("error"); return; }
    const data = new FormData(event.currentTarget);
    requestId.current ??= createRequestId();
    setStatus("sending"); setError("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: requestId.current, name: data.get("name"), email: data.get("email"), message: data.get("message"), website: data.get("website"), consent }),
        signal: AbortSignal.timeout(20000),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string" ? result.error : "Не удалось сохранить заявку. Попробуйте ещё раз.";
        throw new Error(message);
      }
      setStatus("success"); requestAnimationFrame(() => resultRef.current?.focus());
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error && cause.name !== "TimeoutError" && cause.name !== "TypeError" ? cause.message : "Связь прервалась. Данные остались в форме — попробуйте отправить ещё раз.");
    }
  }
  if (status === "success") return <div className="form-success" tabIndex={-1} ref={resultRef} role="status"><span className="success-icon"><Check size={30} /></span><span className="eyebrow">ЗАЯВКА ПРИНЯТА</span><h3>Первый шаг сделан.</h3><p>Ваш запрос сохранён. Следующий шаг — обсудить задачу и согласовать формат аудита по указанной почте.</p><Button className="button button-outline" onClick={() => { requestId.current = null; setConsent(false); setStatus("idle"); }}>Новая заявка <ArrowUpRight size={18} /></Button></div>;
  return <form className="contact-form" onSubmit={submit} aria-label="Заявка на обсуждение проекта"><div className="field-row"><label>Как вас зовут <span aria-hidden="true">*</span><Input name="name" autoComplete="name" placeholder="Ваше имя" required minLength={2} maxLength={100} disabled={status === "sending"} /></label><label>Электронная почта <span aria-hidden="true">*</span><Input name="email" type="email" autoComplete="email" placeholder="you@company.com" required maxLength={254} disabled={status === "sending"} /></label></div><label>Что хотите улучшить?<Textarea name="message" placeholder="Расскажите о бизнесе и задаче — можно в двух словах" maxLength={3000} rows={3} disabled={status === "sending"} /></label><div className="honeypot" aria-hidden="true"><label>Website<Input name="website" autoComplete="off" tabIndex={-1} /></label></div><div className="consent-row"><Checkbox id="lead-consent" checked={consent} onCheckedChange={(value) => setConsent(value === true)} disabled={status === "sending"} /><label htmlFor="lead-consent">Согласен на обработку данных для ответа на заявку.</label></div><button type="button" className="privacy-inline" onClick={onPrivacy}>Как используются данные</button><p id="form-error" role="alert" className="form-error">{error}</p><Button type="submit" className="button button-primary submit-button" disabled={status === "sending"} aria-describedby={error ? "form-error" : undefined}>{status === "sending" ? <>Сохраняем заявку <LoaderCircle className="spinner" size={18} /></> : <>Обсудить проект <ArrowUpRight size={20} /></>}</Button><p className="form-note">Без готового ТЗ тоже можно. Начнём с вашей задачи.</p></form>;
}
