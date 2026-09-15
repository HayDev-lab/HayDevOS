"use client";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

/**
 * Small site-wide UX helpers:
 * - ScrollProgress: thin lime bar showing reading progress.
 * - BackToTop: floating button that appears after the first screen.
 * - useReveal: adds .revealed to [data-reveal] elements as they enter the
 *   viewport (subtle fade-up; disabled by prefers-reduced-motion in CSS).
 */
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
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (targets.length === 0) return;
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("revealed"));
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
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}
