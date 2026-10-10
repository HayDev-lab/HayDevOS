"use client";

import Link from "next/link";
import { workspaceHref } from "@/lib/workspace-routes";

import { FileText, Grid3X3, Home, Search, Sparkles } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { useCoreCopy } from "@/components/core/copy";
import { NotificationsPopover } from "./NotificationsPopover";
import { UserMenu } from "./UserMenu";
import { OwnerAiPanel } from "./OwnerAiPanel";

export function TopBar({
  onOpenSettings,
  onLogout,
}: {
  onOpenSettings: () => void;
  onLogout: () => void;
}) {
  const copy = useCoreCopy();
  const { t } = useLocale();
  const {
    activeModule,
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
    <div className="topbar core-topbar">
      <nav aria-label={copy.navigation}>
        {items.map((item) => item.id === "ownerAi" ? <OwnerAiPanel key={item.id} /> : (
          <Link
            key={item.id}
            className={`nav-item ${activeModule === item.id || (item.id === "modules" && !["dashboard", "ownerAi", "docsmart"].includes(activeModule)) ? "active" : ""}`}
            aria-current={activeModule === item.id ? "page" : undefined}
            href={workspaceHref(item.id)}
          >
            <item.icon />
            <span>{item.name}</span>
          </Link>
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
      <div className="core-account-actions">
        <NotificationsPopover />
        <UserMenu onOpenSettings={onOpenSettings} onLogout={onLogout} />
      </div>
    </div>
  );
}

export default TopBar;
