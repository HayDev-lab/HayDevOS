"use client";
import { useLanguage } from "@/components/language-provider";
import { whyPrinciples } from "@/data/business-os";

/**
 * 05 / WHY HAYDEV — engineering principles in the main flow.
 * Trust used to live only inside the showcase; now it has its own section.
 */
export function WhyHaydev() {
  const { t } = useLanguage();
  return <section id="why" className="section container os-why" aria-labelledby="why-heading">
    <span className="eyebrow">06 / WHY HAYDEV</span>
    <div className="os-section-heading" data-reveal>
      <h2 id="why-heading">{t("Почему HayDev")}<br /><span className="lime-text">{t("и что из этого следует")}</span></h2>
      <p>{t("Четыре инженерных принципа, которые не меняются от проекта к проекту. Это не слоган — это то, как устроена работа.")}</p>
    </div>
    <ol className="why-grid" data-reveal>
      {whyPrinciples.map(principle => (
        <li key={principle.code} className="why-card">
          <div className="why-card-head">
            <span className="why-code" aria-hidden="true">{principle.code}</span>
            <span className="why-label">{principle.label}</span>
          </div>
          <h3>{t(principle.title)}</h3>
          <p>{t(principle.text)}</p>
        </li>
      ))}
    </ol>
    <p className="why-note" data-reveal>{t("Принципы проверяются на продуктах выше: статусы, сроки и документация — как в жизни, без прикрас.")}</p>
  </section>;
}
