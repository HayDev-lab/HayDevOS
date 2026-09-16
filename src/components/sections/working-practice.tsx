"use client";
import { Clock, Flag, Languages, MessageCircle } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { workingPractice } from "@/data/business-os";

const iconMap = { clock: Clock, languages: Languages, messages: MessageCircle, flag: Flag } as const;

/** 11 / Working practice — practical operational facts before the contact form. */
export function WorkingPractice() {
  const { t } = useLanguage();
  return <section id="practice" className="section container working-practice" aria-labelledby="practice-heading">
    <span className="eyebrow">11 / WORKING PRACTICE</span>
    <div className="os-section-heading">
      <h2 id="practice-heading">{t("Как с нами")}<br /><span className="lime-text">{t("работается")}</span></h2>
      <p>{t("Практические вещи, которые обычно выясняются в переписке — написали заранее.")}</p>
    </div>
    <div className="practice-grid" data-reveal>
      {workingPractice.map(fact => {
        const Icon = iconMap[fact.icon as keyof typeof iconMap] ?? Clock;
        return <article key={fact.code} className="practice-card">
          <div className="practice-card-head">
            <span className="practice-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.5} /></span>
            <span className="practice-code">{fact.code}</span>
          </div>
          <h3>{t(fact.title)}</h3>
          <p>{t(fact.text)}</p>
        </article>;
      })}
    </div>
    <p className="practice-note" data-reveal>
      {t("NDA подписываем до обсуждения деталей. Первый разговор ни к чему не обязывает — но обычно с него всё начинается.")}
    </p>
  </section>;
}
