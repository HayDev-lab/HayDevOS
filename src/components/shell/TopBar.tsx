"use client";

import Image from "next/image";
import { FileText, Grid3X3, Home, Search, Sparkles } from "lucide-react";
import { LOCALES, LOCALE_LABELS, useLocale, type Locale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { useCoreCopy } from "@/components/core/copy";
import { NotificationsPopover } from "./NotificationsPopover";
import { UserMenu } from "./UserMenu";

export function TopBar({
  onOpenSettings,
  onLogout,
}: {
  onOpenSettings: () => void;
  onLogout: () => void;
}) {
  const copy = useCoreCopy();
  const { t, locale, setLocale } = useLocale();
  const {
    activeModule,
    setActiveModule,
    searchQuery,
    setSearchQuery,
    setCommandOpen,
  } = useAppStore();
  const items = [
    { id: "dashboard", icon: Home, name: copy.home },
    { id: "modules", icon: Grid3X3, name: copy.modulesLabel },
    { id: "ownerAi", icon: Sparkles, name: "Owner AI" },
    { id: "docsmart", icon: FileText, name: copy.documentsNav },
  ];
  return (
    <header className="topbar core-topbar">
      <button
        type="button"
        className="brand has-logo"
        onClick={() => setActiveModule("dashboard")}
        aria-label={copy.homeLabel}
      >
        <span className="brand-wordmark">
          <Image
            className="brand-logo"
            src="/core/haydevos-logo.png"
            alt="HayDevOS"
            width={1254}
            height={1254}
            priority
            unoptimized
          />
        </span>
      </button>
      <nav aria-label={copy.navigation}>
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`nav-item ${activeModule === item.id || (item.id === "modules" && !["dashboard", "ownerAi", "docsmart"].includes(activeModule)) ? "active" : ""}`}
            aria-current={activeModule === item.id ? "page" : undefined}
            onClick={() => setActiveModule(item.id)}
          >
            <item.icon />
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
      <label className="search">
        <Search />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") setCommandOpen(true);
          }}
          placeholder={copy.searchPlaceholder}
          aria-label={copy.searchLabel}
        />
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label={t("common.search")}
        >
          <kbd>⌘K</kbd>
        </button>
      </label>
      <button
        type="button"
        className="core-mobile-search"
        onClick={() => setCommandOpen(true)}
        aria-label={t("common.search")}
      >
        <Search />
      </button>
      <label className="language-control">
        <span className="sr-only">{copy.language}</span>
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
          aria-label={copy.language}
        >
          {LOCALES.map((language) => (
            <option key={language} value={language}>
              {LOCALE_LABELS[language]}
            </option>
          ))}
        </select>
      </label>
      <div className="core-account-actions">
        <NotificationsPopover />
        <UserMenu onOpenSettings={onOpenSettings} onLogout={onLogout} />
      </div>
    </header>
  );
}

export default TopBar;
