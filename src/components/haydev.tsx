"use client";
import { useLanguage } from "@/components/language-provider";
import { useAppView } from "@/components/app-view";
import { lazy, Suspense, useRef, useState } from "react";
import { ArrowUpRight, Check, Copy, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { BusinessCore } from "@/components/sections/business-core";
import { WhatWeBuild } from "@/components/sections/what-we-build";
import { CustomSoftware } from "@/components/sections/custom-software";
import { AutomationSection } from "@/components/sections/ai-automation";
import { TransformationScenarios } from "@/components/sections/scenarios";
import { HaydevProducts } from "@/components/sections/haydev-products";
import { WhyHaydev } from "@/components/sections/why-haydev";
import { EngagementModels } from "@/components/sections/engagement-models";
import { IndustrySystems } from "@/components/sections/industry-systems";

import { BusinessAudit } from "@/components/sections/business-audit";
import { FaqSection } from "@/components/sections/faq";

import { ContactForm } from "@/components/sections/contact-form";
import { BackToTop, MobileCta, ScrollProgress, SectionDots, useReveal, useScrollSpy } from "@/components/site-chrome";
import { navigation as baseNavigation } from "@/data/site-content";

const SystemDetails = lazy(() => import("@/components/sections/system-details"));

function Brand() {
  const { t } = useLanguage();
  return (
    <a href="#home" className="brand" aria-label={t("HayDev — на главную")}>
      <span className="brand-mark" aria-hidden="true">h<span>↗</span></span>
      <span>haydev<span className="brand-period">.</span></span>
    </a>
  );
}

function SectionLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return <div className="section-label"><span className="section-number">{number}</span><span>{children}</span></div>;
}

const languages = [
  { code: "hy", label: "Հայ", name: "Հայերեն" },
  { code: "ru", label: "Рус", name: "Русский" },
  { code: "en", label: "Eng", name: "English" },
] as const;

/** Copy-to-clipboard contact email with visible feedback. */
function CopyEmail() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  async function copy() {
    const email = "hello@haydev.am";
    // The async clipboard API needs a secure context AND user activation;
    // fall back to the legacy execCommand path when it is unavailable.
    try {
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(email);
        else throw new Error("no-clipboard");
      } catch {
        const area = document.createElement("textarea");
        area.value = email;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard is fully blocked — the mailto link still works.
    }
  }
  return (
    <div className="footer-email">
      <a href="mailto:hello@haydev.am">hello@haydev.am</a>
      <button type="button" onClick={copy} aria-live="polite" aria-label={copied ? t("Почта скопирована") : t("Скопировать почту")}>
        {copied ? <>{t("Скопировано")} <Check size={14} /></> : <><Copy size={14} /> {t("Скопировать")}</>}
      </button>
    </div>
  );
}

export default function HayDev() {
  const { t, localize, locale, setLocale } = useLanguage();
  const { openAudit } = useAppView();
  const navigation = localize(baseNavigation);
  const [menuOpen, setMenuOpen] = useState(false);
  const [industry, setIndustry] = useState("Не указана");
  const [auditSummary, setAuditSummary] = useState("");
  const [auditAttached, setAuditAttached] = useState(false);
  const [detailsOpened, setDetailsOpened] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  useReveal();
  useScrollSpy();

  const privacyOpener = useRef<HTMLElement | null>(null);
  const showcaseRef = useRef<HTMLDetailsElement>(null);
  function openPrivacy() {
    privacyOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPrivacy(true);
  }
  function openShowcase(anchor?: string) {
    const details = showcaseRef.current;
    if (details) { details.open = true; setDetailsOpened(true); }
    // The showcase content is lazy-loaded (Suspense) and the ERP accordion
    // mounts asynchronously — poll for the target instead of a single frame.
    const started = performance.now();
    const tryScroll = () => {
      const target = anchor ? document.getElementById(anchor) : details;
      if (target) { target.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      if (performance.now() - started < 3000) requestAnimationFrame(tryScroll);
    };
    requestAnimationFrame(tryScroll);
  }

  const renderNavItem = (item: { href: string; label: string }) =>
    item.href === "#audit" ? (
      <a
        key={item.href}
        href="#audit"
        onClick={(event) => {
          event.preventDefault();
          setMenuOpen(false);
          openAudit();
        }}
      >
        {item.label}
      </a>
    ) : (
      <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
    );

  return <>
    <ScrollProgress />
    <a href="#main" className="skip-link">{t("Перейти к содержимому")}</a>
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label={t("Основная навигация")}>{navigation.map(renderNavItem)}</nav>
        <div className="header-actions">
          <nav className="language-switch" aria-label={t("Выберите язык")}>
            {languages.map((language) => (
              <a
                key={language.code}
                href="#"
                hrefLang={language.code}
                lang={language.code}
                aria-label={language.name}
                aria-current={locale === language.code ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  setLocale(language.code);
                }}
              >
                {language.label}
              </a>
            ))}
          </nav>
          <a
            className="button button-primary os-cta header-audit"
            href="#contact"
          >
            {t("Начать проект")} ↗
          </a>
          <Button
            className="menu-toggle"
            variant="ghost"
            aria-label={menuOpen ? t("Закрыть меню") : t("Открыть меню")}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {menuOpen && (
        <nav
          id="mobile-menu"
          className="mobile-nav"
          aria-label={t("Мобильная навигация")}
          onKeyDown={(event) => {
            if (event.key === "Escape") setMenuOpen(false);
          }}
        >
          {navigation.map(renderNavItem)}
          <a href="#contact" onClick={() => setMenuOpen(false)}>{t("Обсудить проект")}<ArrowUpRight size={18} /></a>
        </nav>
      )}
    </header>
    <main id="main">
      <BusinessCore />
      <WhatWeBuild />
      <CustomSoftware />
      <AutomationSection />
      <TransformationScenarios />
      <HaydevProducts onShowcase={() => openShowcase("erp")} />
      <div className="container">
        <details ref={showcaseRef} className="lite-details" onToggle={(e) => { if (e.currentTarget.open) setDetailsOpened(true); }}>
          <summary>
            <span className="lite-details-copy">
              <span className="lite-details-code">PRODUCT&nbsp;SHOWCASE</span>
              <span className="lite-details-title">{t("Продукты и системы подробнее")}</span>
            </span>
            <span className="lite-details-icon" aria-hidden="true">＋</span>
          </summary>
          {detailsOpened && (
            <Suspense fallback={<p className="compact-note">{t("Загрузка…")}</p>}>
              <SystemDetails />
            </Suspense>
          )}
        </details>
      </div>
      <WhyHaydev />
      <EngagementModels />
      <IndustrySystems onSelect={setIndustry} />
      <BusinessAudit industry={industry} onApply={(value) => { setAuditSummary(value); setAuditAttached(true); }} />
      <FaqSection />

      <section className="contact-section" id="contact" aria-labelledby="contact-heading">
        <div className="container contact-grid">
          <div className="contact-copy">
            <SectionLabel number="11">{t("РАССКАЖИТЕ О ЗАДАЧЕ")}</SectionLabel>
            <h2 id="contact-heading">{t("Что вы хотите")}<br /><span className="lime-text">{t("создать?")}</span></h2>
            <p>{t("CRM, портал, платформа или AI-система — расскажите задачу.")}<br />{t("HayDev спроектирует решение и покажет, как его реализовать.")}</p>
            <div className="contact-next-steps" aria-label={t("Что дальше")}>
              <span className="eyebrow">{t("ЧТО ДАЛЬШЕ")}</span>
              <ol>
                <li><span>01</span><div><strong>{t("Ответ")}</strong><p>{t("Отвечаем и уточняем задачу")}</p></div></li>
                <li><span>02</span><div><strong>{t("Обсуждение")}</strong><p>{t("Формат работы, этапы и оценка")}</p></div></li>
                <li><span>03</span><div><strong>{t("Архитектура")}</strong><p>{t("План решения и следующий шаг")}</p></div></li>
              </ol>
            </div>
            <div className="contact-next"><span className="small-cross">+</span><span>{t("Идея → архитектура → работающий продукт")}</span></div>
          </div>
          <ContactForm onPrivacy={openPrivacy} message={auditSummary} onMessageChange={setAuditSummary} auditAttached={auditAttached} />
        </div>
      </section>
    </main>
    <footer className="site-footer container">
      <div className="footer-top">
        <div>
          <Brand />
          <p>{t("Разрабатываем программные продукты: web-платформы, AI-системы, ERP/CRM и автоматизация. Software development для бизнеса в Армении.")}</p>
        </div>
        <div className="footer-links">
          <span className="eyebrow">{t("НАВИГАЦИЯ")}</span>
          {navigation.map(renderNavItem)}
        </div>
        <div className="footer-links">
          <span className="eyebrow">{t("НАЧАТЬ ДИАЛОГ")}</span>
          <CopyEmail />
          <a href="#contact">{t("Обсудить проект")} <ArrowUpRight size={16} /></a>
          <a href="#audit">{t("Пройти Business Audit")} <ArrowUpRight size={16} /></a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} HayDev</span>
        <button onClick={openPrivacy}>{t("Правовая информация")}</button>
        <a href="#home">{t("Наверх")} <ArrowUpRight size={14} /></a>
      </div>
    </footer>
    <BackToTop />
    <SectionDots />
    <MobileCta />
    <Dialog open={privacy} onOpenChange={setPrivacy}>
      <DialogContent
        className="privacy-dialog"
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          privacyOpener.current?.focus();
        }}
      >
        <DialogTitle>{t("Как используются данные")}</DialogTitle>
        <DialogDescription>{t("Информация о форме заявки и подготовке сайта к открытому запуску.")}</DialogDescription>
        <p>{t("Имя, электронная почта и описание задачи сохраняются для обсуждения вашего проекта. Согласие относится только к ответу на обращение, а не к рекламной рассылке.")}</p>
        <p>{t("Не отправляйте пароли, платёжные данные или конфиденциальные документы. Сайт не использует рекламные трекеры.")}</p>
        <p className="legal-placeholder">{t("Закрытая демонстрация. Используйте тестовые контактные данные. Для публичного приёма обращений необходимы утверждённые владельцем реквизиты и политика хранения данных.")}</p>
        <DialogClose asChild>
          <Button className="button button-outline">{t("Понятно")} <X size={17} /></Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  </>;
}
