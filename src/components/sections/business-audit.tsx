"use client";
import { useRef, useState } from 'react';
import { ClipboardCheck, Clock, ListChecks, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { auditQuestions } from '@/data/business-os';

const factIcons = { questions: ListChecks, minutes: Clock, privacy: ShieldCheck } as const;

export function BusinessAudit({ industry, onApply }: { industry: string; onApply: (summary: string) => void }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(8).fill(null));
  const [complete, setComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const q = auditQuestions[step];
  const selected = answers[step];

  function move(next: number) { setStep(next); requestAnimationFrame(() => heading.current?.focus()); }
  function result() { setComplete(true); requestAnimationFrame(() => heading.current?.focus()); }
  function summaryText() {
    return `${t('Сфера бизнеса')}: ${t(industry)}\nAI Business Audit — ${t('Предварительная карта по вашим ответам')}\n${auditQuestions.map((x, i) => `${t(x.title)} ${t(x.options[answers[i]!])}`).join('\n')}`;
  }
  function apply() { onApply(summaryText()); }
  async function copyAnswers() {
    const text = summaryText();
    // Async clipboard needs a secure context + user activation; fall back to
    // the legacy execCommand path inside the closed demo sandbox.
    try {
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
        else throw new Error('no-clipboard');
      } catch {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard unavailable — the apply-to-form path still works */ }
  }
  const QuestionsIcon = factIcons.questions, MinutesIcon = factIcons.minutes, PrivacyIcon = factIcons.privacy;
  return <section id="audit" className="section container os-audit">
    <span className="eyebrow">09 / BUSINESS AUDIT</span>
    <div className="os-section-heading"><h2>{t('Не знаете, с чего начать?')}<br /><span className="lime-text">{t('Пройдите Business Audit.')}</span></h2><p>{t('8 вопросов — и вы увидите, какие процессы можно улучшить или автоматизировать. Без регистрации, ответы остаются на странице.')}</p></div>
    <ul className="audit-facts" aria-label={t('О формате аудита')}>
      <li><span className="audit-fact-icon" aria-hidden="true"><QuestionsIcon size={18} strokeWidth={1.5} /></span><strong>8</strong><span>{t('вопросов')}</span></li>
      <li><span className="audit-fact-icon" aria-hidden="true"><MinutesIcon size={18} strokeWidth={1.5} /></span><strong>~5</strong><span>{t('минут')}</span></li>
      <li><span className="audit-fact-icon" aria-hidden="true"><PrivacyIcon size={18} strokeWidth={1.5} /></span><strong>{t('0')}</strong><span>{t('регистраций')}</span></li>
    </ul>
    <details className="audit-launch"><summary className="button button-primary os-cta">{t("Начать аудит")} <span aria-hidden="true">↗</span></summary><div className="audit-shell"><div className="audit-side"><span>AUTOMATION MAP</span><p>{t("Сфера бизнеса")}: {t(industry)} <a className="text-link" href="#industries">{t("Выбрать отрасль")} ↗</a></p><ol>{auditQuestions.map((x, i) => <li key={x.area} className={answers[i] !== null ? 'answered' : ''}><span>{answers[i] !== null ? '✓' : String(i + 1).padStart(2, '0')}</span>{t(x.area)}</li>)}</ol><p>{t('Предварительная диагностика по правилам, не AI-анализ ваших систем. Выводы проверим на аудите.')}</p></div><div className="audit-workspace">{!complete ? <><div className="audit-progress"><span>{t('Вопрос')} {step + 1} / 8</span><progress aria-label={t('Прогресс аудита')} max={8} value={answers.filter(x => x !== null).length} /></div><h3 tabIndex={-1} ref={heading} id="audit-question">{t(q.title)}</h3><RadioGroup key={step} aria-labelledby="audit-question" value={selected === null ? '' : String(selected)} onValueChange={value => setAnswers(old => old.map((x, i) => i === step ? Number(value) : x))} className="audit-options">{q.options.map((x, i) => <label key={x} htmlFor={`audit-${step}-${i}`} className={selected === i ? 'chosen' : ''}><RadioGroupItem id={`audit-${step}-${i}`} value={String(i)} /><span>{t(x)}</span></label>)}</RadioGroup><div className="audit-actions"><Button className="button button-outline" disabled={step === 0} onClick={() => move(step - 1)}>{t('Назад')}</Button><Button className="button button-primary" disabled={selected === null} onClick={() => step === 7 ? result() : move(step + 1)}>{t(step === 7 ? 'Показать карту' : 'Далее')} ↗</Button></div></> : <><span className="eyebrow">AUTOMATION MAP</span><h3 ref={heading} tabIndex={-1}>{t('Предварительная карта по вашим ответам')}</h3><div className="audit-results">{auditQuestions.map((x, i) => { const risk = x.risk[answers[i]!]; return <div key={x.area}><span>{t(x.area)}</span><strong className={risk ? 'risk' : ''}>{t(risk === null ? 'Нужно уточнить' : risk ? 'Проверить ручную работу' : 'По ответу: без разрыва')}</strong><small>{t(x.options[answers[i]!])}</small></div>; })}</div><p className="audit-result-note">{t('Это направления проверки, а не оценка эффективности. Интеграции, качество данных и возможности AI требуют отдельного разбора.')}</p><div className="audit-actions"><Button className="button button-outline" onClick={() => { setComplete(false); move(0); }}>{t('Изменить ответы')}</Button><Button className="button button-outline audit-copy" onClick={copyAnswers} aria-live="polite"><ClipboardCheck size={16} aria-hidden="true" />{copied ? t('Скопировано') : t('Скопировать ответы')}</Button><a className="button button-primary os-cta" href="#contact" onClick={apply}>{t('Получить подробный аудит')} ↗</a></div></>}</div></div></details>
  </section>;
}
