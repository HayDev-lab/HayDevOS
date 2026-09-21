"use client";

/**
 * TopBar — fixed top navigation bar.
 *
 * Left:   sidebar collapse toggle + HayDevOS wordmark + breadcrumb
 * Center: global search trigger (button styled as input)
 * Right:  language switcher, theme toggle, notifications bell, help, user menu
 *
 * On mobile: brand collapses, search becomes a compact icon button.
 */

import { useTheme } from "next-themes";
import {
  PanelLeft,
  Menu,
  Search,
  Sun,
  Moon,
  HelpCircle,
  Sparkles,
  ChevronRight,
  Globe,
  History,
} from "lucide-react";

import { useAppStore } from "@/lib/store/app-store";
import { useLocale, LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { getModule } from "@/lib/modules/registry";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { NotificationsPopover } from "./NotificationsPopover";
import { UserMenu } from "./UserMenu";

interface TopBarProps {
  onOpenSettings: () => void;
  onLogout: () => void;
  onOpenMobileSidebar: () => void;
}

export function TopBar({ onOpenSettings, onLogout, onOpenMobileSidebar }: TopBarProps) {
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const {
    activeModule,
    setActiveModule,
    toggleSidebar,
    setCommandOpen,
    setOwnerAiOpen,
    setActivityOpen,
    setShortcutsOpen,
  } = useAppStore();

  const mod = getModule(activeModule);
  const BreadcrumbIcon = mod?.icon ?? Sparkles;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border px-3",
        "glass",
      )}
    >
      {/* Left: mobile sidebar toggle + collapse + brand + breadcrumb */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileSidebar}
          className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="hidden h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:inline-flex"
          aria-label={t("shell.sidebar.collapse")}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        {/* Brand */}
        <button
          type="button"
          onClick={() => setActiveModule("dashboard")}
          className="group flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted/40"
          aria-label="HayDevOS — go to dashboard"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-lime transition-all group-hover:glow-lime">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:block">
            HayDev<span className="text-lime">OS</span>
          </span>
        </button>

        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="hidden items-center gap-1.5 pl-2 text-xs text-muted-foreground md:flex"
        >
          <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
          <BreadcrumbIcon className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span className="font-medium text-foreground">
            {mod ? t(mod.nameKey) : activeModule}
          </span>
        </nav>
      </div>

      {/* Center: search trigger */}
      <div className="mx-auto hidden w-full max-w-md flex-1 sm:block">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className={cn(
            "group flex h-9 w-full items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-all",
            "hover:border-primary/40 hover:bg-muted/60",
          )}
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-lime" />
          <span className="flex-1 text-left text-xs">
            {t("shell.search.placeholder")}
          </span>
          <kbd className="hidden items-center gap-0.5 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:flex">
            {t("shell.search.hint")}
          </kbd>
        </button>
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-1">
        {/* Mobile search icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCommandOpen(true)}
          className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden"
          aria-label={t("common.search")}
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Activity timeline (Task 13) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActivityOpen(true)}
              className="hidden h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
              aria-label={t("activity.title")}
            >
              <History className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t("activity.title")} · ⌘H
          </TooltipContent>
        </Tooltip>

        {/* Owner AI quick toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOwnerAiOpen(true)}
              className="hidden h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
              aria-label={t("shell.ownerAi.title")}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t("shell.ownerAi.title")} · ⌘J
          </TooltipContent>
        </Tooltip>

        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("shell.user.language")}
            >
              <Globe className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-[160px]">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("shell.user.language")}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(v) => setLocale(v as Locale)}
            >
              {LOCALES.map((l) => (
                <DropdownMenuRadioItem key={l} value={l}>
                  {LOCALE_LABELS[l]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("shell.topbar.toggleTheme")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t("shell.topbar.toggleTheme")}
          </TooltipContent>
        </Tooltip>

        {/* Help — opens the keyboard-shortcuts dialog (Task 13) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShortcutsOpen(true)}
              className="hidden h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex"
              aria-label={t("shell.topbar.help")}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t("shell.topbar.help")} · ?
          </TooltipContent>
        </Tooltip>

        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

        <NotificationsPopover />

        <UserMenu onOpenSettings={onOpenSettings} onLogout={onLogout} />
      </div>
    </header>
  );
}

export default TopBar;
