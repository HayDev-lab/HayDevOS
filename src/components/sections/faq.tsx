"use client";
import { useLanguage } from "@/components/language-provider";
import { ArrowUpRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqItems } from "@/data/business-os";

/** 07 / FAQ — honest answers to the questions every client asks first. */
export function FaqSection() {
  const { t } = useLanguage();
  return <section id="faq" className="section container os-faq" aria-labelledby="faq-heading">
    <span className="eyebrow">07 / FAQ</span>
    <div className="os-section-heading">
      <h2 id="faq-heading">{t("Частые вопросы")}<br /><span className="lime-text">{t("до первого разговора")}</span></h2>
      <p>{t("Отвечаем честно: без «средних цен» и обещанных сроков до понимания задачи.")}</p>
    </div>
    <Accordion type="single" collapsible className="faq-list" data-reveal>
      {faqItems.map((item) => (
        <AccordionItem key={item.code} value={item.code}>
          <AccordionTrigger>
            <span className="faq-index">{item.code}</span>
            <span className="faq-question">{t(item.q)}</span>
          </AccordionTrigger>
          <AccordionContent>
            <p>{t(item.a)}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
    <div className="faq-cta" data-reveal>
      <p>{t("Остался вопрос, которого нет в списке?")}</p>
      <a className="text-link" href="#contact">{t("Задайте его напрямую")} <ArrowUpRight size={16} /></a>
    </div>
  </section>;
}
