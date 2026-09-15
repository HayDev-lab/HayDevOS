"use client";
import { ArrowUpRight, Check } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useAppView } from "@/components/app-view";
import { engagementModels } from "@/data/business-os";

/**
 * 06 / ENGAGEMENT MODELS — how a client can work with us.
 * Three honest formats (no fake pricing): fixed scope, dedicated team,
 * audit-first. Answers the "how do we start?" question before the contact form.
 */
export function EngagementModels() {
  const { t } = useLanguage();
  const { openAudit } = useAppView();
  return <section id="models" className="section container os-models" aria-labelledby="models-heading">
    <span className="eyebrow">06 / ENGAGEMENT MODELS</span>
    <div className="os-section-heading" data-reveal>
      <h2 id="models-heading">{t("С чего начать работу")}<br /><span className="lime-text">{t("три формата сотрудничества")}</span></h2>
      <p>{t("Не важно, есть ли у вас готовое ТЗ. Формат подбирается под задачу — и его можно сменить после первого цикла.")}</p>
    </div>
    <div className="models-grid" data-reveal>
      {engagementModels.map(model => (
        <article key={model.code} className={`model-card${model.accent ? " model-accent" : ""}`}>
          <div className="model-card-head">
            <span className="model-code" aria-hidden="true">{model.code}</span>
            <span className="model-label">{model.label}</span>
          </div>
          <h3>{t(model.title)}</h3>
          <p>{t(model.text)}</p>
          <div className="model-fits">
            <span className="eyebrow">{t("ПОДХОДИТ, ЕСЛИ")}</span>
            <ul>
              {model.fits.map(fit => <li key={fit}><Check size={14} aria-hidden="true" />{t(fit)}</li>)}
            </ul>
          </div>
          {model.cta && (model.cta.audit
            ? <a className="model-cta" href="#audit" onClick={event => { event.preventDefault(); openAudit(); }}>{t(model.cta.label)} <ArrowUpRight size={16} /></a>
            : <a className="model-cta" href={model.cta.href ?? "#contact"}>{t(model.cta.label)} <ArrowUpRight size={16} /></a>)}
        </article>
      ))}
    </div>
    <p className="models-note" data-reveal>{t("Все форматы начинаются одинаково: разговор о задаче. Никаких обязательств до вашей готовности.")}</p>
  </section>;
}
