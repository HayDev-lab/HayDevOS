"use client";
import { useLanguage } from "@/components/language-provider";
import { useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { BusinessCore } from '@/components/sections/business-core';
import { GrowthSystem, AutomationSection } from '@/components/sections/growth-system';
import { IndustrySystems } from '@/components/sections/industry-systems';
import { MissionControl } from '@/components/sections/mission-control';
import { BusinessAudit } from '@/components/sections/business-audit';
import { ErpSection } from "@/components/sections/erp-section";
import { ContactForm } from "@/components/sections/contact-form";
import { navigation as baseNavigation, stages as baseStages } from "@/data/site-content";

function Brand() { const { t } = useLanguage(); return <a href="#home" className="brand" aria-label={t("HayDev — на главную")}><span className="brand-mark" aria-hidden="true">h<span>↗</span></span><span>haydev<span className="brand-period">.</span></span></a>; }
function SectionLabel({ number, children }: { number: string; children: React.ReactNode }) { return <div className="section-label"><span className="section-number">{number}</span><span>{children}</span></div>; }


export default function HayDev() {
 const { t, localize, locale } = useLanguage();
 const { navigation, stages } = localize({ navigation: baseNavigation, stages: baseStages });
  const [menuOpen, setMenuOpen] = useState(false);
  const [industry, setIndustry] = useState("Не указана");
  const [auditSummary, setAuditSummary] = useState("");
  const [auditAttached, setAuditAttached] = useState(false);
  const [stage, setStage] = useState(0);
  const [privacy, setPrivacy] = useState(false);

  const privacyOpener = useRef<HTMLElement | null>(null);
  function openPrivacy() { privacyOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setPrivacy(true); }
  return <><a href="#main" className="skip-link">{t("Перейти к содержимому")}</a>
    <header className="site-header"><div className="container header-inner"><Brand /><nav className="desktop-nav" aria-label={t("Основная навигация")}>{navigation.map(item => <a href={item.href} key={item.href}>{item.label}</a>)}</nav><div className="header-actions"><nav className="language-switch" aria-label={t("Выберите язык")}>{([{ code: "hy", label: "Հայ", name: "Հայերեն" }, { code: "ru", label: "Рус", name: "Русский" }, { code: "en", label: "Eng", name: "English" }] as const).map(language => <a key={language.code} href={`/${language.code}`} hrefLang={language.code} lang={language.code} aria-label={language.name} aria-current={locale === language.code ? "page" : undefined}>{language.label}</a>)}</nav><a className="button button-primary os-cta header-audit" href="#audit">{t("Начать аудит")} ↗</a><Button className="menu-toggle" variant="ghost" aria-label={menuOpen ? t("Закрыть меню") : t("Открыть меню")} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button></div></div>{menuOpen && <nav id="mobile-menu" className="mobile-nav" aria-label={t("Мобильная навигация")} onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }}>{navigation.map(item => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}<ArrowUpRight size={18} /></a>)}<a href="#contact" onClick={() => setMenuOpen(false)}>{t("Спроектировать решение")}<ArrowUpRight size={18} /></a></nav>}</header>
    <main id="main"><BusinessCore /><GrowthSystem /><ErpSection /><AutomationSection /><IndustrySystems onSelect={setIndustry}/><MissionControl/><BusinessAudit industry={industry} onApply={value=>{setAuditSummary(value);setAuditAttached(true);}}/>

    <section className="section container compact-process" id="process" aria-labelledby="process-heading"><SectionLabel number="08">{t("ТРАЕКТОРИЯ ПРОЕКТА")}</SectionLabel><h2 id="process-heading">{t("Аудит, карта, запуск.")} </h2><div className="process-steps" role="group" aria-label={t("Этапы проекта")}>{stages.map((item,i)=><button key={item.en} aria-pressed={stage===i} aria-controls="stage-details" onClick={()=>setStage(i)}><span>0{i+1}</span>{item.name}</button>)}</div><div className="compact-stage" id="stage-details" aria-live="polite"><div><h3>{stages[stage].title}</h3><p>{stages[stage].text}</p></div><div><span className="eyebrow">{t("НА ВЫХОДЕ")}</span><p>{stages[stage].deliverable}</p></div></div></section>

    <section className="container compact-extras" id="outcomes" aria-label={t("Результат")}><Accordion type="single" collapsible><AccordionItem value="trust"><AccordionTrigger>{t("ИНЖЕНЕРИЯ ДОВЕРИЯ")}</AccordionTrigger><AccordionContent><div className="compact-trust">{[["Контроль и доступы","Разделяем роли, защищаем ключи на сервере, согласуем правила работы с данными. В важных ИИ-сценариях решение остаётся за человеком."],["Архитектура под задачу","Выбираем инструменты по процессам и нагрузке. Документируем связи, чтобы систему можно было поддерживать и развивать."],["Измеримый прогресс","До старта определяем события и показатели. После запуска оцениваем реальные изменения, а не обещаем проценты без исходных данных."]].map(([title,text])=><article key={title}><h3>{t(title)}</h3><p>{t(text)}</p></article>)}</div></AccordionContent></AccordionItem></Accordion></section>

    <section className="contact-section" id="contact" aria-labelledby="contact-heading"><div className="container contact-grid"><div className="contact-copy"><SectionLabel number="09">{t("НАЧНЁМ С ВАШЕЙ ЗАДАЧИ")}</SectionLabel><h2 id="contact-heading">{t("Покажите нам")}<br /><span className="lime-text">{t("свой бизнес.")}</span></h2><p>{t("Расскажите, где теряются время и заявки.")}<br />{t("Обсудим, что можно изменить и с чего начать.")}</p><div className="contact-next"><span className="small-cross">+</span><span>{t("Знакомство → аудит → карта решений")}</span></div></div><ContactForm onPrivacy={openPrivacy} message={auditSummary} onMessageChange={setAuditSummary} auditAttached={auditAttached} /></div></section></main>
    <footer className="site-footer container"><div className="footer-top"><div><Brand /><p>{t("ERP, CRM, сайты, бизнес-ПО и AI-автоматизация для компаний в Армении.")}</p></div><div className="footer-links"><span className="eyebrow">{t("НАВИГАЦИЯ")}</span>{navigation.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</div><div className="footer-links"><span className="eyebrow">{t("НАЧАТЬ ДИАЛОГ")}</span><a href="#contact">{t("Спроектировать решение")} <ArrowUpRight size={16} /></a><a href="#contact">{t("Получить аудит")} <ArrowUpRight size={16} /></a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} HayDev</span><button onClick={openPrivacy}>{t("Правовая информация")}</button><a href="#home">{t("Наверх")} <ArrowUpRight size={14} /></a></div></footer>
    <Dialog open={privacy} onOpenChange={setPrivacy}><DialogContent className="privacy-dialog" showCloseButton={false} onCloseAutoFocus={(event) => { event.preventDefault(); privacyOpener.current?.focus(); }}><DialogTitle>{t("Как используются данные")}</DialogTitle><DialogDescription>{t("Информация о форме заявки и подготовке сайта к открытому запуску.")}</DialogDescription><p>{t("Имя, электронная почта и описание задачи сохраняются для обсуждения вашего проекта. Согласие относится только к ответу на обращение, а не к рекламной рассылке.")}</p><p>{t("Не отправляйте пароли, платёжные данные или конфиденциальные документы. Сайт не использует рекламные трекеры.")}</p><p className="legal-placeholder">{t("Закрытая демонстрация. Используйте тестовые контактные данные. Для публичного приёма обращений необходимы утверждённые владельцем реквизиты и политика хранения данных.")}</p><DialogClose asChild><Button className="button button-outline">{t("Понятно")} <X size={17} /></Button></DialogClose></DialogContent></Dialog></>;
}
