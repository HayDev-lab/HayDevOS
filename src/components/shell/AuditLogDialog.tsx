"use client";

/**
 * AuditLogDialog — dialog showing the mock audit log as a filterable table.
 */

import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { mockAuditLogs } from "@/lib/mock";
import { useLocale } from "@/lib/i18n";
import { formatDateTime, statusColor, toneClasses, cn } from "@/lib/utils";
import { History } from "lucide-react";

interface AuditLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogDialog({ open, onOpenChange }: AuditLogDialogProps) {
  const { t, locale } = useLocale();
  const [filter, setFilter] = useState("all");

  const actions = useMemo(() => {
    const set = new Set(mockAuditLogs.map((l) => l.actionKey));
    return ["all", ...Array.from(set).sort()];
  }, []);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? mockAuditLogs
        : mockAuditLogs.filter((l) => l.actionKey === filter),
    [filter],
  );

  /** Resolve an audit action key ("audit.action.lead.stage_changed" → localized
   *  "Lead stage changed"). Interpolates `params` when provided. Falls back to
   *  the raw key string if the i18n entry is missing. */
  function actionLabel(actionKey: string, params?: Record<string, string | number>): string {
    return t(actionKey, params);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong flex max-h-[88vh] w-[min(96vw,920px)] flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-lime">
              <History className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-semibold">
                {t("shell.audit.title")}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t("shell.audit.subtitle")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <span className="text-xs text-muted-foreground">
            {filtered.length} / {mockAuditLogs.length}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t("shell.audit.filter")}
            </span>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-8 w-[220px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actions.map((a) => (
                  <SelectItem key={a} value={a} className="text-xs">
                    {a === "all" ? t("shell.audit.all") : actionLabel(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-popover/95 backdrop-blur">
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2 font-medium">{t("shell.audit.time")}</th>
                <th className="px-3 py-2 font-medium">{t("shell.audit.user")}</th>
                <th className="px-3 py-2 font-medium">{t("shell.audit.action")}</th>
                <th className="px-3 py-2 font-medium">{t("shell.audit.entity")}</th>
                <th className="px-5 py-2 font-medium">{t("shell.audit.entityId")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((log) => {
                const tone = statusColor(log.actionKey);
                const toneCls = toneClasses(tone);
                return (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-5 py-2.5 text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt, locale)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-medium text-foreground">
                        {log.userName}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border px-1.5 py-0 text-[10px] font-medium",
                          toneCls.border,
                          toneCls.bg,
                          toneCls.text,
                        )}
                      >
                        {actionLabel(log.actionKey, log.params)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {log.entityType}
                    </td>
                    <td className="px-5 py-2.5">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {log.entityId ?? "—"}
                      </code>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {t("misc.noResults")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default AuditLogDialog;
