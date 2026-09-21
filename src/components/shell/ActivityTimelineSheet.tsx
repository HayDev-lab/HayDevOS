"use client";

/**
 * ActivityTimelineSheet — slide-in sheet showing the global activity feed.
 *
 * Mounted by ShellLayout alongside OwnerAiPanel. Toggled via `activityOpen`
 * in the app store (Ctrl/Cmd+H is wired in ShellLayout; the TopBar's Activity
 * button also opens it).
 *
 * Layout:
 *   - Header:        icon + title + "Last 7 days" subtitle + live-pulse dot.
 *                    (SheetContent's built-in close button sits top-right.)
 *   - Stats strip:   4 mini-cards — Total events, Critical count (rose),
 *                    Today's count, Modules touched. Computed once via
 *                    `getActivityStats()` and memoised.
 *   - Filter bar:    module Select, severity chip toggles, search Input.
 *                    A "Clear filters" button appears when any filter is
 *                    active.
 *   - Timeline:      vertical list grouped by day with sticky day headers.
 *                    Each event row has a module badge, severity dot, title
 *                    (resolved via t()), actor avatar, and a drilldown
 *                    affordance. Clicking anywhere on the row triggers
 *                    `setActiveModule(deepLink.moduleId)`, shows a toast,
 *                    and closes the sheet.
 *   - Empty state:   when filters yield nothing — a friendly icon + the
 *                    `activity.empty.title` / `activity.empty.body` copy +
 *                    a "Clear filters" button.
 *   - Footer:        "Export CSV" button (writes CSV to clipboard + toast).
 *
 * Premium dark enterprise styling:
 *   - Sheet slides in from the right. ~520px desktop, full-screen mobile.
 *   - Severity colours: info=cyan, success=lime, warning=amber, critical=rose.
 *   - Module badges use each module's accent.
 *   - framer-motion staggered fade-in on the timeline items. Reduced-motion
 *     collapses transitions globally via globals.css.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Download,
  ArrowUpRight,
  Inbox,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useAppStore } from "@/lib/store/app-store";
import { useLocale, t as translateStatic } from "@/lib/i18n";
import { ModuleRegistry, type ModuleAccent } from "@/lib/modules/registry";
import {
  buildActivityFeed,
  getActivityStats,
  groupByDay,
  exportActivityCsv,
  type ActivityEvent,
  type ActivitySeverity,
} from "@/lib/mock/activityFeed";
import { relativeTime, formatDateTime, cn, initials } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SEVERITIES: ActivitySeverity[] = ["info", "success", "warning", "critical"];

const SEVERITY_DOT: Record<ActivitySeverity, string> = {
  info: "bg-cyan",
  success: "bg-lime",
  warning: "bg-amber",
  critical: "bg-rose",
};

const SEVERITY_TEXT: Record<ActivitySeverity, string> = {
  info: "text-cyan",
  success: "text-lime",
  warning: "text-amber",
  critical: "text-rose",
};

const SEVERITY_BG: Record<ActivitySeverity, string> = {
  info: "bg-cyan/10",
  success: "bg-lime/10",
  warning: "bg-amber/10",
  critical: "bg-rose/10",
};

const ACCENT_TEXT: Record<ModuleAccent, string> = {
  lime: "text-lime",
  cyan: "text-cyan",
  amber: "text-amber",
  rose: "text-rose",
  violet: "text-violet",
};

const ACCENT_BG: Record<ModuleAccent, string> = {
  lime: "bg-lime/10",
  cyan: "bg-cyan/10",
  amber: "bg-amber/10",
  rose: "bg-rose/10",
  violet: "bg-violet/10",
};

interface ActorAvatarColor {
  bg: string;
  text: string;
}

const ACTOR_AVATAR: Record<string, ActorAvatarColor> = {
  lime: { bg: "bg-lime/15", text: "text-lime" },
  cyan: { bg: "bg-cyan/15", text: "text-cyan" },
  amber: { bg: "bg-amber/15", text: "text-amber" },
  rose: { bg: "bg-rose/15", text: "text-rose" },
  violet: { bg: "bg-violet/15", text: "text-violet" },
};

interface StatCardProps {
  labelKey: string;
  value: number;
  /** Tailwind classes for the value accent text (text-cyan / text-rose / etc.) */
  accentClass: string;
  /** Tailwind classes for the icon background tint (bg-rose/10 etc.) */
  bgClass: string;
  /** Lucide icon to render */
  Icon: LucideIcon;
}

function StatCard({ labelKey, value, accentClass, bgClass, Icon }: StatCardProps) {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 py-2">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          bgClass,
          accentClass,
        )}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold tabular-nums leading-tight", accentClass)}>
          {value}
        </p>
        <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground/80">
          {t(labelKey)}
        </p>
      </div>
    </div>
  );
}

export function ActivityTimelineSheet() {
  const { t, locale } = useLocale();
  const { activityOpen, setActivityOpen, setActiveModule } = useAppStore();

  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<ActivitySeverity | "all">("all");
  const [query, setQuery] = useState("");

  // Stats are computed once from the full feed (not the filtered one) so the
  // totals remain stable as the user toggles filters.
  const stats = useMemo(() => getActivityStats(), []);

  const filtered = useMemo<ActivityEvent[]>(
    () =>
      buildActivityFeed({
        module: moduleFilter === "all" ? undefined : moduleFilter,
        severity: severityFilter === "all" ? undefined : severityFilter,
        query: query.trim() || undefined,
        days: 7,
      }),
    [moduleFilter, severityFilter, query],
  );

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  const hasActiveFilter =
    moduleFilter !== "all" || severityFilter !== "all" || query.trim().length > 0;

  function clearFilters() {
    setModuleFilter("all");
    setSeverityFilter("all");
    setQuery("");
  }

  function dayLabel(group: {
    labelKey: "activity.day.today" | "activity.day.yesterday" | null;
    key: string;
  }): string {
    if (group.labelKey) return t(group.labelKey);
    const d = new Date(group.key);
    if (isNaN(d.getTime())) return group.key;
    return new Intl.DateTimeFormat(
      locale === "hy" ? "hy-AM" : locale === "ru" ? "ru-RU" : "en-US",
      { weekday: "short", month: "short", day: "numeric" },
    ).format(d);
  }

  function handleDrilldown(ev: ActivityEvent) {
    setActivityOpen(false);
    setActiveModule(ev.deepLink.moduleId);
    const mod = ModuleRegistry.find((m) => m.id === ev.deepLink.moduleId);
    const moduleName = mod ? translateStatic(mod.nameKey, locale) : ev.deepLink.moduleId;
    toast.success(t("activity.toast.opened", { module: moduleName }));
  }

  function handleExport() {
    const csv = exportActivityCsv(filtered);
    // We don't actually persist the file (sandboxed env), but a toast confirms
    // the export ran with the CSV size, and the data is on the clipboard if
    // the user wants to paste it.
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        void navigator.clipboard.writeText(csv);
      }
    } catch {
      // ignore clipboard errors
    }
    toast.success(`${t("activity.exported")} · ${csv.length}B`);
  }

  return (
    <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
      <SheetContent
        side="right"
        className="glass-strong flex h-full w-full flex-col gap-0 border-l border-border p-0 sm:max-w-[520px]"
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b border-border px-4 py-3.5 pr-12">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan/10 text-cyan glow-cyan">
              <Search className="h-4 w-4" aria-hidden />
            </span>
            <div className="space-y-0.5">
              <SheetTitle className="text-base font-semibold tracking-tight">
                {t("activity.title")}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-cyan"
                  aria-hidden
                />
                {t("activity.last7days")}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Stats strip — 4 mini-cards */}
        <div className="grid grid-cols-2 gap-2 border-b border-border px-4 py-3 sm:grid-cols-4">
          <StatCard
            labelKey="activity.stats.total"
            value={stats.total}
            accentClass="text-foreground"
            bgClass="bg-cyan/10"
            Icon={Inbox}
          />
          <StatCard
            labelKey="activity.stats.critical"
            value={stats.critical}
            accentClass="text-rose"
            bgClass="bg-rose/10"
            Icon={ArrowUpRight}
          />
          <StatCard
            labelKey="activity.stats.today"
            value={stats.today}
            accentClass="text-cyan"
            bgClass="bg-cyan/10"
            Icon={Search}
          />
          <StatCard
            labelKey="activity.stats.modules"
            value={stats.modulesTouched}
            accentClass="text-lime"
            bgClass="bg-lime/10"
            Icon={Inbox}
          />
        </div>

        {/* Filter bar */}
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="h-8 flex-1 border-border bg-muted/40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  {t("activity.filter.allModules")}
                </SelectItem>
                {ModuleRegistry.filter((m) => m.id !== "settings").map((m) => {
                  const Icon = m.icon;
                  return (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />
                        {t(m.nameKey)}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-8 gap-1.5 border-border px-2.5 text-xs text-muted-foreground hover:text-foreground"
              aria-label={t("activity.export")}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("activity.export")}</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {SEVERITIES.map((sev) => {
              const active = severityFilter === sev;
              return (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(active ? "all" : sev)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                    active
                      ? cn(SEVERITY_TEXT[sev], "border-current", SEVERITY_BG[sev])
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={active}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", SEVERITY_DOT[sev])} />
                  {t(`activity.filter.${sev}`)}
                </button>
              );
            })}
            {hasActiveFilter ? (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3 w-3" />
                {t("activity.filter.clear")}
              </button>
            ) : null}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("activity.filter.search")}
              className="h-8 border-border bg-muted/40 pl-8 text-xs"
              aria-label={t("activity.filter.search")}
            />
          </div>
        </div>

        {/* Timeline */}
        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                <Inbox className="h-5 w-5" aria-hidden />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t("activity.empty.title")}
                </p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  {t("activity.empty.body")}
                </p>
              </div>
              {hasActiveFilter ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-1 h-7 gap-1.5 border-border text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  {t("activity.filter.clear")}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="px-2 py-2">
              <div className="px-3 pb-1 text-right text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {t("activity.count", { n: filtered.length })}
              </div>
              {groups.map((group) => (
                <section key={group.key} className="relative">
                  {/* Sticky day header */}
                  <div className="sticky top-0 z-10 -mx-2 mb-1 border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {dayLabel(group)}
                    </p>
                  </div>
                  <ul className="relative pl-6 pr-2">
                    {/* Vertical line for the timeline */}
                    <span
                      className="absolute left-2 top-0 bottom-0 w-px bg-border"
                      aria-hidden
                    />
                    {group.events.map((ev, idx) => {
                      const mod = ModuleRegistry.find((m) => m.id === ev.module);
                      const ModIcon: LucideIcon = mod?.icon ?? Inbox;
                      const accent = mod?.accent ?? "cyan";
                      const actor =
                        ACTOR_AVATAR[ev.actor.color] ?? ACTOR_AVATAR.cyan;
                      const evTs = new Date(ev.ts);
                      const titleStr = translateStatic(
                        ev.titleKey,
                        locale,
                        ev.titleParams,
                      );
                      return (
                        <motion.li
                          key={ev.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.18,
                            delay: Math.min(idx * 0.018, 0.36),
                            ease: "easeOut",
                          }}
                          className="relative"
                        >
                          {/* Node on the timeline */}
                          <span
                            className={cn(
                              "absolute -left-[1.18rem] top-3 h-2.5 w-2.5 rounded-full border-2 border-background",
                              SEVERITY_DOT[ev.severity],
                            )}
                            aria-hidden
                          />
                          <button
                            type="button"
                            onClick={() => handleDrilldown(ev)}
                            className="group block w-full rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/40"
                            aria-label={t("activity.toast.opened", {
                              module: mod ? translateStatic(mod.nameKey, locale) : ev.module,
                            })}
                          >
                            <div className="flex items-start gap-2.5">
                              {/* Module badge */}
                              <span
                                className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                                  ACCENT_BG[accent],
                                  ACCENT_TEXT[accent],
                                )}
                              >
                                <ModIcon className="h-3.5 w-3.5" aria-hidden />
                              </span>

                              {/* Body */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <p className="truncate text-xs font-medium text-foreground">
                                    {titleStr}
                                  </p>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                                        {relativeTime(ev.ts, locale)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      {formatDateTime(ev.ts, locale)}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "border px-1.5 py-0 text-[9px] font-medium",
                                      ACCENT_TEXT[accent],
                                    )}
                                  >
                                    {mod ? t(mod.nameKey) : ev.module}
                                  </Badge>
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0 text-[9px] font-medium",
                                      SEVERITY_TEXT[ev.severity],
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        SEVERITY_DOT[ev.severity],
                                      )}
                                      aria-hidden
                                    />
                                    {t(`activity.filter.${ev.severity}`)}
                                  </span>
                                </div>
                                <div className="mt-1.5 flex items-center justify-between gap-2">
                                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                                    <span
                                      className={cn(
                                        "flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold",
                                        actor.bg,
                                        actor.text,
                                      )}
                                      aria-hidden
                                    >
                                      {initials(ev.actor.name)}
                                    </span>
                                    {ev.actor.name}
                                  </span>
                                  <ArrowUpRight
                                    className="h-3 w-3 text-muted-foreground/40 transition-colors group-hover:text-foreground"
                                    aria-hidden
                                  />
                                </div>
                                {/* Hidden datetime for screen readers */}
                                <span className="sr-only">
                                  {evTs.toISOString()}
                                </span>
                              </div>
                            </div>
                          </button>
                        </motion.li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer hint */}
        <div className="border-t border-border px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground/70">
          ⌘H · {t("activity.title")}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ActivityTimelineSheet;
