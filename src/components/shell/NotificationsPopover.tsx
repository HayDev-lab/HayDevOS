"use client";

/**
 * NotificationsPopover — bell icon + dropdown listing mock notifications.
 * Renders an unread badge, a "mark all read" action, and a per-item icon
 * chosen by notification type.
 */

import { useState, useMemo } from "react";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
  AtSign,
  Clock,
  AlertOctagon,
  Server,
  type LucideIcon,
} from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { useLocale } from "@/lib/i18n";
import { mockNotifications, type NotificationType } from "@/lib/mock";
import { relativeTime, toneClasses, cn } from "@/lib/utils";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertOctagon,
  mention: AtSign,
  sla: Clock,
  system: Server,
};

const TYPE_TONE: Record<NotificationType, "info" | "success" | "warning" | "destructive" | "cyan" | "amber" | "rose"> = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "destructive",
  mention: "cyan",
  sla: "amber",
  system: "rose",
};

export function NotificationsPopover() {
  const { t, locale } = useLocale();
  const { setActiveModule } = useAppStore();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(mockNotifications);

  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success(t("shell.toast.markedRead"));
  }

  function handleClick(link: string | null) {
    setOpen(false);
    if (!link) return;
    // link is like "leados/ld_005" — switch to the module
    const moduleId = link.split("/")[0];
    if (moduleId) setActiveModule(moduleId);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("shell.topbar.notifications")}
          className="relative h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
              aria-label={`${unread} unread`}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={8}
        className="max-h-[calc(100dvh-1rem)] w-[min(92vw,380px)] overflow-hidden bg-popover p-0 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t("shell.notifications.title")}
            </h3>
            {unread > 0 && (
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 px-1.5 text-[10px] text-lime"
              >
                {t("shell.notifications.unread", { n: unread })}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={unread === 0}
            aria-label={t("shell.notifications.markAllRead")}
            title={t("shell.notifications.markAllRead")}
            className="size-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span className="sr-only">
              {t("shell.notifications.markAllRead")}
            </span>
          </Button>
        </div>

        <ScrollArea
          type="always"
          className="h-[min(70dvh,640px)] overscroll-contain"
        >
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
              <Bell className="h-5 w-5 text-muted-foreground/60" />
              {t("shell.notifications.empty")}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const Icon = TYPE_ICON[n.type];
                const tone = TYPE_TONE[n.type];
                const toneCls = toneClasses(tone);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n.link)}
                      className={cn(
                        "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                        !n.read && "bg-primary/[0.03]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                          toneCls.bg,
                          toneCls.text,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {t(n.titleKey, n.params)}
                          </p>
                          {!n.read && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {t(n.bodyKey, n.params)}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          {relativeTime(n.createdAt, locale)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationsPopover;
