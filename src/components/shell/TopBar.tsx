"use client";

import Image from "next/image";
import {
  Bot,
  FileText,
  Globe,
  Grid3X3,
  Home,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_LABELS, useLocale, type Locale } from "@/lib/i18n";
import { ModuleRegistry } from "@/lib/modules/registry";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { NotificationsPopover } from "./NotificationsPopover";
import { UserMenu } from "./UserMenu";

interface TopBarProps {
  onOpenSettings: () => void;
  onLogout: () => void;
}

const MODULE_MENU = ModuleRegistry.filter(
  (module) => !["dashboard", "ownerAi", "docsmart", "control", "settings"].includes(module.id),
);

export function TopBar({ onOpenSettings, onLogout }: TopBarProps) {
  const { t, locale, setLocale } = useLocale();
  const { activeModule, setActiveModule, setCommandOpen } = useAppStore();
  const modulesActive = !["dashboard", "ownerAi", "docsmart"].includes(activeModule);

  const navButton =
    "haydev-nav-item inline-flex items-center justify-center gap-2 rounded-full border border-transparent px-4 py-2.5 text-xs font-semibold text-slate-200/82 transition-all hover:border-sky-400/30 hover:bg-sky-400/10 hover:text-white";

  return (
    <header className="haydev-topbar relative z-40 flex shrink-0 items-center gap-3 border-b border-sky-300/15 px-4 backdrop-blur-2xl sm:px-6">
      <button
        type="button"
        onClick={() => setActiveModule("dashboard")}
        className="haydev-brand group flex shrink-0 items-center justify-center rounded-xl focus-visible:outline-none"
        aria-label="HayDevOS — go to dashboard"
      >
        <Image
          src="/branding/haydevos-core-logo.png"
          alt="HayDevOS"
          width={1254}
          height={1254}
          priority
          className="haydev-brand-logo object-contain transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </button>

      <nav className="haydev-primary-nav flex min-w-0 items-center gap-1" aria-label={t("shell.navigation")}>
        <button
          type="button"
          onClick={() => setActiveModule("dashboard")}
          className={cn(navButton, activeModule === "dashboard" && "is-active")}
          aria-current={activeModule === "dashboard" ? "page" : undefined}
        >
          <Home className="h-4 w-4" strokeWidth={1.8} />
          <span>{t("nav.dashboard")}</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cn(navButton, modulesActive && "is-active")}>
              <Grid3X3 className="h-4 w-4" strokeWidth={1.8} />
              <span>{t("shell.settings.modules")}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={14}
            className="w-[310px] border-sky-300/20 bg-[#05152a]/95 p-2 shadow-[0_28px_80px_-34px_rgba(21,145,255,0.75)] backdrop-blur-2xl"
          >
            <DropdownMenuLabel className="px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-amber-200/80">
              HayDevOS ecosystem
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-sky-300/15" />
            {MODULE_MENU.map((module) => {
              const Icon = module.icon;
              return (
                <DropdownMenuItem
                  key={module.id}
                  onSelect={() => setActiveModule(module.id)}
                  className="group my-1 gap-3 rounded-xl px-3 py-2.5 focus:bg-sky-400/10 focus:text-white"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-sky-300/25 bg-sky-400/10 text-amber-200">
                    <Icon className="h-4 w-4" strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-100">{t(module.nameKey)}</span>
                    <span className="block truncate text-[10px] text-slate-400">{module.description}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator className="bg-sky-300/15" />
            <DropdownMenuItem
              onSelect={onOpenSettings}
              className="rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:bg-amber-300/10 focus:text-amber-100"
            >
              {t("module.settings")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={() => setActiveModule("ownerAi")}
          className={cn(navButton, activeModule === "ownerAi" && "is-active")}
          aria-current={activeModule === "ownerAi" ? "page" : undefined}
        >
          <Bot className="h-4 w-4" strokeWidth={1.8} />
          <span>Owner AI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule("docsmart")}
          className={cn(navButton, activeModule === "docsmart" && "is-active")}
          aria-current={activeModule === "docsmart" ? "page" : undefined}
        >
          <FileText className="h-4 w-4" strokeWidth={1.8} />
          <span>{t("module.docsmart")}</span>
        </button>
      </nav>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="haydev-search ml-auto hidden min-w-0 max-w-[280px] flex-1 items-center gap-2 rounded-full border border-sky-300/25 bg-[#031126]/72 px-4 py-2.5 text-left text-xs text-slate-400 shadow-[inset_0_1px_rgba(255,255,255,0.05)] transition hover:border-amber-300/45 hover:text-slate-200 lg:flex"
      >
        <Search className="h-4 w-4 shrink-0 text-sky-300" />
        <span className="truncate">{t("shell.search.placeholder")}</span>
        <kbd className="ml-auto rounded-md border border-sky-300/15 bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-500">
          {t("shell.search.hint")}
        </kbd>
      </button>

      <div className="haydev-topbar-actions flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCommandOpen(true)}
          className="h-9 w-9 rounded-full border border-sky-300/15 text-sky-100 hover:bg-sky-400/10 lg:hidden"
          aria-label={t("common.search")}
        >
          <Search className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 gap-2 rounded-full border border-sky-300/20 bg-[#06172b]/70 px-3 text-xs text-slate-200 hover:bg-sky-400/10"
              aria-label={t("shell.user.language")}
            >
              <Globe className="h-4 w-4 text-sky-300" />
              <span className="hidden xl:inline">{LOCALE_LABELS[locale]}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={12} className="w-[170px] border-sky-300/20 bg-[#05152a]/95">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-400">
              {t("shell.user.language")}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={locale} onValueChange={(value) => setLocale(value as Locale)}>
              {LOCALES.map((language) => (
                <DropdownMenuRadioItem key={language} value={language}>
                  {LOCALE_LABELS[language]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <NotificationsPopover />
        <UserMenu onOpenSettings={onOpenSettings} onLogout={onLogout} />
      </div>
    </header>
  );
}

export default TopBar;
