"use client";
import { useEffect, useState } from "react";
import { ArrowUp, ArrowUpRight, Mail } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

/**
 * Small site-wide UX helpers:
 * - ScrollProgress: thin lime bar showing reading progress.
 * - BackToTop: floating button that appears after the first screen.
 * - SectionDots: desktop-only right-side dot navigation synced to scroll.
 * - MobileCta: sticky bottom bar on mobile with the two key actions;
 *   hides once the contact section itself is on screen.
 * - useReveal: adds .revealed to [data-reveal] elements as they enter the
 *   viewport (subtle fade-up; disabled by prefers-reduced-motion in CSS).
 */

/** Sections tracked by the dot navigation and the command palette, in page order. */
export const pageSections = [
  { id: "home", label: "Главная" },
  { id: "build", label: "Что мы создаём" },
  { id: "custom", label: "Custom Software" },
  { id: "automation", label: "AI и автоматизация" },
  { id: "scenarios", label: "Что меняется" },
  { id: "products", label: "Продукты" },
  { id: "why", label: "Почему HayDev" },
  { id: "models", label: "Форматы работы" },
  { id: "industries", label: "Отрасли" },
  { id: "audit", label: "Business Audit" },
  { id: "faq", label: "FAQ" },
  { id: "practice", label: "Как с нами работается" },
  { id: "contact", label: "Контакт" },
];

function useActiveSection() {
  const [active, setActive] = useState<string>("");
  useEffect(() => {
    const sections = pageSections
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.scrollY + (document.querySelector<HTMLElement>(".site-header")?.offsetHeight ?? 74) + window.innerHeight * 0.35;
      let current = sections[0].id;
      for (const section of sections) {
        if (section.offsetTop <= line) current = section.id;
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 40) {
        current = sections[sections.length - 1].id;
      }
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return active;
}

export function SectionDots() {
  const { t } = useLanguage();
  const active = useActiveSection();
  return (
    <nav className="section-dots" aria-label={t("Разделы страницы")}>
      {pageSections.map((entry) => (
        <a
          key={entry.id}
          href={`#${entry.id}`}
          aria-current={active === entry.id ? "true" : undefined}
          aria-label={t(entry.label)}
        >
          <span className="section-dot" aria-hidden="true" />
          <span className="section-dot-label">{t(entry.label)}</span>
        </a>
      ))}
    </nav>
  );
}

export function MobileCta() {
  const { t } = useLanguage();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    // The bar shows after the first screen and hides again while the contact
    // section or the footer itself is on screen (the CTA is already there).
    const inView = new Map<Element, boolean>();
    let frame = 0;
    const update = () => {
      frame = 0;
      const anyVisible = Array.from(inView.values()).some(Boolean);
      const pastHero = window.scrollY >= window.innerHeight * 0.85;
      setHidden(anyVisible || !pastHero);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) inView.set(entry.target, entry.isIntersecting);
        schedule();
      },
      { threshold: 0.08 },
    );
    const contact = document.getElementById("contact");
    const footer = document.querySelector(".site-footer");
    if (contact) observer.observe(contact);
    if (footer) observer.observe(footer);
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div className="mobile-cta" data-hidden={hidden}>
      <a className="mobile-cta-mail" href="mailto:hello@haydev.am" aria-label={t("Написать на почту")}>
        <Mail size={18} />
      </a>
      <a className="button button-primary mobile-cta-button" href="#contact">
        {t("Начать проект")} <ArrowUpRight size={17} />
      </a>
    </div>
  );
}

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const { scrollY, innerHeight } = window;
      const max = document.documentElement.scrollHeight - innerHeight;
      setProgress(max > 0 ? Math.min(1, scrollY / max) : 0);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="scroll-progress" aria-hidden="true"><div style={{ transform: `scaleX(${progress})` }} /></div>;
}

export function BackToTop() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(window.scrollY > window.innerHeight * 1.2);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <button
      type="button"
      className="back-to-top"
      aria-label={t("Вернуться наверх")}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp size={20} />
    </button>
  );
}

export function useReveal() {
  useEffect(() => {
    const reveal = (el: HTMLElement) => el.classList.add("revealed");
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach(reveal);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    const observeAll = () => document.querySelectorAll<HTMLElement>("[data-reveal]:not(.revealed)")
      .forEach((el) => observer.observe(el));
    observeAll();
    // Dynamically mounted [data-reveal] nodes (e.g. a filtered grid that
    // re-mounts) are picked up here instead of staying hidden forever.
    const mutation = new MutationObserver(() => observeAll());
    mutation.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); mutation.disconnect(); };
  }, []);
}

/**
 * Scrollspy: highlights the nav link matching the section currently in the
 * viewport. Links are matched by href="#id" against tracked sections; a
 * section counts as active once its top passes the header + offset line,
 * staying active until the next one takes over (classic one-pager behaviour).
 */
export function useScrollSpy() {
  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(".desktop-nav a[href^='#']"));
    if (links.length === 0) return;
    const ids = links.map((link) => link.hash.slice(1)).filter(Boolean);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.scrollY + (document.querySelector<HTMLElement>(".site-header")?.offsetHeight ?? 74) + window.innerHeight * 0.28;
      let active: string | null = null;
      for (const section of sections) {
        if (section.offsetTop <= line) active = section.id;
      }
      // Near the very bottom, always highlight the last tracked section.
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 40) {
        active = sections[sections.length - 1].id;
      }
      links.forEach((link) => link.setAttribute("data-current", link.hash.slice(1) === active ? "true" : "false"));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
