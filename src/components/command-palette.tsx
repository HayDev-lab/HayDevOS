"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp, ArrowUpRight, Boxes, Check, Copy, Languages, LayoutGrid,
  Mail, ScanSearch, Search, Sparkles,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import { useLanguage } from "@/components/language-provider";
import type { Locale } from "@/lib/i18n";
import { useAppView } from "@/components/app-view";
import { pageSections } from "@/components/site-chrome";
import { heroScenes } from "@/data/business-os";

/**
 * Global command palette (⌘K / Ctrl+K, or "/"):
 * - jump to any section of the one-pager;
 * - switch the site language (ru / en / hy);
 * - cycle the hero WebGL scene (CORE / BUILD / AUTOMATE / PRODUCTS);
 * - quick actions: Business Audit, copy contact email, back to top.
 *
 * The palette talks to the hero scene through the `haydev:scene` window
 * event (BusinessCore listens for it), which keeps this component decoupled
 * from the hero's internal state.
 */

const paletteLanguages: { code: Locale; label: string; own: string }[] = [
  { code: "ru", label: "Русский", own: "RU" },
  { code: "en", label: "English", own: "EN" },
  { code: "hy", label: "Հայերեն", own: "HY" },
];

/** Tiny clipboard helper with the legacy execCommand fallback (see CopyEmail). */
async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return true; }
    throw new Error("no-clipboard");
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch { return false; }
  }
}

export function CommandTrigger({ className }: { className?: string }) {
  const { t } = useLanguage();
  const open = useCallback(() => window.dispatchEvent(new CustomEvent("haydev:palette-open")), []);
  return (
    <button type="button" className={className ?? "command-trigger"} onClick={open} aria-label={t("Быстрый поиск по сайту (Ctrl+K)")}>
      <Search size={14} aria-hidden="true" />
      <span className="command-trigger-kbd" aria-hidden="true">Ctrl K</span>
    </button>
  );
}

export function CommandPalette() {
  const { t, locale, setLocale } = useLanguage();
  const { openAudit } = useAppView();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const togglePalette = () => setOpen((prev) => !prev);
    const openPalette = () => setOpen(true);
    const onKey = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        togglePalette();
        return;
      }
      // "/" opens the palette as well — unless the user is typing somewhere.
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
        if (!typing) { event.preventDefault(); setOpen(true); }
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("haydev:palette-open", openPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("haydev:palette-open", openPalette);
    };
  }, []);

  // Reset transient copy feedback whenever the palette closes (Esc/backdrop).
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && copyTimer.current) { clearTimeout(copyTimer.current); setCopied(false); }
  };
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const jump = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const setHeroScene = (index: number) => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.dispatchEvent(new CustomEvent("haydev:scene", { detail: index }));
  };
  const copyEmail = async () => {
    const ok = await copyText("hello@haydev.am");
    if (ok) {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => { setCopied(false); setOpen(false); }, 1400);
    }
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t("Быстрая навигация")}
      description={t("Переход к разделам, языки и действия сайта")}
      className="command-palette"
      showCloseButton={false}
    >
      <CommandInput placeholder={t("Раздел, язык или действие…")} />
      <CommandList>
        <CommandEmpty>{t("Ничего не найдено — Esc, чтобы закрыть")}</CommandEmpty>

        <CommandGroup heading={t("Разделы")}>
          {pageSections.map((section, index) => (
            <CommandItem key={section.id} value={`${section.id} ${t(section.label)}`} onSelect={() => jump(section.id)}>
              {index === 0 ? <Sparkles size={16} aria-hidden="true" /> : <LayoutGrid size={16} aria-hidden="true" />}
              <span>{t(section.label)}</span>
              <CommandShortcut>{String(index + 1).padStart(2, "0")}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading={t("Язык")}>
          {paletteLanguages.map((language) => (
            <CommandItem
              key={language.code}
              value={`language ${language.label} ${language.own}`}
              onSelect={() => { setLocale(language.code); setOpen(false); }}
            >
              <Languages size={16} aria-hidden="true" />
              <span>{language.label}</span>
              <CommandShortcut>{locale === language.code ? "✓" : language.own}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading={t("Сцена на главном экране")}>
          {heroScenes.map((scene, index) => (
            <CommandItem key={scene.id} value={`scene ${scene.id} ${t(scene.label)}`} onSelect={() => setHeroScene(index)}>
              {index === 3 ? <Boxes size={16} aria-hidden="true" /> : <ScanSearch size={16} aria-hidden="true" />}
              <span>{t(scene.label)}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading={t("Действия")}>
          <CommandItem value={`action audit ${t("Пройти Business Audit")}`} onSelect={() => { setOpen(false); openAudit(); }}>
            <ScanSearch size={16} aria-hidden="true" />
            <span>{t("Пройти Business Audit")}</span>
            <CommandShortcut>8Q</CommandShortcut>
          </CommandItem>
          <CommandItem value={`action email ${t("Скопировать почту")}`} onSelect={() => { void copyEmail(); }}>
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            <span>{copied ? t("Почта скопирована") : t("Скопировать почту")}</span>
            <CommandShortcut>hello@haydev.am</CommandShortcut>
          </CommandItem>
          <CommandItem value={`action contact ${t("Написать на почту")}`} onSelect={() => { setOpen(false); window.location.href = "mailto:hello@haydev.am"; }}>
            <Mail size={16} aria-hidden="true" />
            <span>{t("Написать на почту")}</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </CommandItem>
          <CommandItem value={`action top ${t("Вернуться наверх")}`} onSelect={() => { setOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <ArrowUp size={16} aria-hidden="true" />
            <span>{t("Вернуться наверх")}</span>
          </CommandItem>
        </CommandGroup>

        <div className="command-foot" aria-hidden="true">
          <span>↑↓ {t("выбор")}</span>
          <span>↵ {t("перейти")}</span>
          <span>esc {t("закрыть")}</span>
        </div>
      </CommandList>
    </CommandDialog>
  );
}
