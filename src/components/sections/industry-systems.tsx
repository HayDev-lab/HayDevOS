"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { industrySystems } from "@/data/business-os";

export function IndustrySystems({ onSelect }: { onSelect: (name: string) => void }) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState("retail");
  const item = industrySystems.find((entry) => entry.id === selected)!;

  function choose(id: string) {
    setSelected(id);
    onSelect(industrySystems.find((entry) => entry.id === id)!.name);
  }

  return (
    <section className="section container os-industries" id="industries">
      <span className="eyebrow">06 / INDUSTRIES</span>
      <div className="os-section-heading">
        <h2>{t("Что мы можем построить для вашей отрасли")}</h2>
        <p>{t("Выберите отрасль — увидите пример системы и продукты, которые можно собрать для неё.")}</p>
      </div>
      <div className="industry-desktop" role="group" aria-label={t("Сфера бизнеса")}>
        {industrySystems.map((entry) => <button key={entry.id} aria-pressed={selected === entry.id} onClick={() => choose(entry.id)}>{t(entry.name)}</button>)}
      </div>
      <div className="industry-mobile">
        <label htmlFor="industry-os">{t("Сфера бизнеса")}</label>
        <NativeSelect id="industry-os" value={selected} onChange={(event) => choose(event.target.value)}>
          {industrySystems.map((entry) => <NativeSelectOption key={entry.id} value={entry.id}>{t(entry.name)}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <div className="industry-system" aria-live="polite" data-reveal>
        <div className="industry-system-header"><span>{t(item.name)}</span><span>{t("ПРИМЕР АРХИТЕКТУРЫ")}</span></div>
        <ol className="industry-pipeline" key={selected}>
          {item.flow.map((step, index) => <li key={step}><span className="pipeline-index">{String(index + 1).padStart(2, "0")}</span><strong>{t(step)}</strong>{index < item.flow.length - 1 && <span className="pipeline-arrow" aria-hidden="true">→</span>}</li>)}
        </ol>
        <p>{t(item.note)}</p>
        <div className="industry-builds"><span className="eyebrow">{t("МОЖНО СОБРАТЬ")}</span><p>{t(item.builds)}</p></div>
        <a className="text-link" href="#contact">{t("Обсудить систему для отрасли")} ↗</a>
      </div>
    </section>
  );
}
