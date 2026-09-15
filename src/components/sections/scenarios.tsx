"use client";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { transformationScenarios } from "@/data/business-os";

/**
 * 04 / WHAT CHANGES — honest before/after scenarios.
 * Each card flips between the "before" (muted) and "after" (lime) state;
 * no invented metrics, only what a correctly built system does by design.
 */
export function TransformationScenarios() {
  const { t } = useLanguage();
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  return <section id="scenarios" className="section container os-scenarios" aria-labelledby="scenarios-heading">
    <span className="eyebrow">04 / WHAT CHANGES</span>
    <div className="os-section-heading" data-reveal>
      <h2 id="scenarios-heading">{t("Знакомая ситуация?")}<br /><span className="lime-text">{t("Так она выглядит после.")}</span></h2>
      <p>{t("Четыре сценария, с которых чаще всего начинается работа. Переключите карточку — и увидьте разницу между «как сейчас» и «как становится».")}</p>
    </div>
    <div className="scenarios-grid" data-reveal>
      {transformationScenarios.map(scenario => {
        const isAfter = !!flipped[scenario.code];
        return <article key={scenario.code} className={`scenario-card${isAfter ? " state-after" : " state-before"}`}>
          <div className="scenario-card-head">
            <span className="scenario-code" aria-hidden="true">{scenario.code}</span>
            <span className="scenario-label">{t(scenario.label)}</span>
            <button
              type="button"
              className="scenario-flip"
              aria-pressed={isAfter}
              onClick={() => setFlipped(prev => ({ ...prev, [scenario.code]: !prev[scenario.code] }))}
            >
              <span className="scenario-flip-label" data-state={isAfter ? "after" : "before"}>{t(isAfter ? "ПОСЛЕ" : "ДО")}</span>
              <span className="scenario-flip-switch" aria-hidden="true"><i /></span>
              <span className="sr-only">{t(isAfter ? "Показать состояние «до»" : "Показать состояние «после»")}</span>
            </button>
          </div>
          <h3>{t(scenario.title)}</h3>
          <div className="scenario-body" aria-live="polite">
            <p className="scenario-summary">{t(isAfter ? scenario.after : scenario.before)}</p>
            <ul className={isAfter ? "scenario-points points-after" : "scenario-points points-before"}>
              {(isAfter ? scenario.afterPoints : scenario.beforePoints).map(point =>
                <li key={point}>{isAfter ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}{t(point)}</li>)}
            </ul>
          </div>
          <div className="scenario-card-foot" aria-hidden="true">
            <span className="scenario-state-tag" data-state={isAfter ? "after" : "before"}>{isAfter ? <ArrowRight size={12} /> : null}{t(isAfter ? "SYSTEM" : "MANUAL")}</span>
            <span className="scenario-flip-hint">{t("нажмите, чтобы переключить")}</span>
          </div>
        </article>;
      })}
    </div>
    <p className="scenarios-note" data-reveal>{t("Без выдуманных цифр: результат проектируется под ваши процессы — и вы решаете, что именно измерять.")} <a className="text-link" href="#audit">{t("Проверить свои процессы")} <ArrowUpRight size={14} /></a></p>
  </section>;
}
