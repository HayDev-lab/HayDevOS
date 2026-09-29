"use client";

/**
 * AutomationsListView — table of every automation with status pill, success
 * rate, version, last run + an enabled switch. Row click → Builder.
 */

import { motion } from "framer-motion";
import { Plus, Zap, Pause, Play, Edit3 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { cn, relativeTime, toneClasses, statusColor } from "@/lib/utils";
import type { Automation } from "../types";
import { localizeAutomationText } from "../localization";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  automations: Automation[];
  onNew: () => void;
  onEdit: (id: string) => void;
  onToggle: (id: string) => void;
}

export function AutomationsListView({ automations, onNew, onEdit, onToggle }: Props) {
  const { t, locale } = useLocale();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("automation.tab.automations")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            {automations.length} {t("automation.tab.automations").toLowerCase()} ·{" "}
            {automations.filter((a) => a.status === "active").length} {t("automation.status.active").toLowerCase()}
          </p>
        </div>
        <Button onClick={onNew} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          {t("automation.new")}
        </Button>
      </div>

      <div
        className="h-[clamp(360px,calc(100dvh-20rem),640px)] overflow-auto overscroll-contain rounded-xl border border-border bg-card/40 [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/35"
        data-automation-scroll-region
        tabIndex={0}
        aria-label={t("automation.tab.automations")}
      >
          <Table
            className="min-w-[1180px] table-fixed"
            containerClassName="min-w-[1180px] overflow-visible"
          >
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[7%]" />
              <col className="w-[4%]" />
              <col className="w-[5%]" />
            </colgroup>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="whitespace-normal text-[11px] leading-tight">{t("automation.col.name")}</TableHead>
                <TableHead className="whitespace-normal text-[11px] leading-tight">{t("automation.col.trigger")}</TableHead>
                <TableHead className="whitespace-normal text-center text-[11px] leading-tight">{t("automation.col.actions")}</TableHead>
                <TableHead className="whitespace-normal text-[11px] leading-tight">{t("automation.col.status")}</TableHead>
                <TableHead className="whitespace-normal text-right text-[11px] leading-tight">{t("automation.col.successRate")}</TableHead>
                <TableHead className="whitespace-normal text-[11px] leading-tight">{t("automation.col.lastRun")}</TableHead>
                <TableHead className="whitespace-normal text-center text-[11px] leading-tight">{t("automation.col.version")}</TableHead>
                <TableHead className="whitespace-normal text-center text-[11px] leading-tight">{t("automation.col.enabled")}</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {automations.map((a, i) => {
                const rate = a.runs.total > 0 ? Math.round((a.runs.success / a.runs.total) * 100) : 0;
                const statusTone = statusColor(a.status);
                const statusCls = toneClasses(statusTone);
                return (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(i * 0.025, 0.25) }}
                    className="group cursor-pointer border-border transition-colors hover:bg-muted/30"
                    onClick={() => onEdit(a.id)}
                  >
                    <TableCell className="overflow-hidden whitespace-normal py-3">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="line-clamp-2 font-medium text-foreground" title={a.name}>
                          {a.name}
                        </span>
                        {a.description && (
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {a.description}
                          </span>
                        )}
                        <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          {a.dedupKey}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="overflow-hidden">
                      <Badge variant="outline" className="max-w-full gap-1 border-border bg-muted/40 text-xs">
                        <Zap className="h-3 w-3 text-cyan" />
                        <span
                          className="truncate"
                          title={localizeAutomationText(a.trigger.type, locale)}
                        >
                          {localizeAutomationText(a.trigger.type, locale)}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs text-foreground">
                        {t("automation.actionCount", { count: a.actions.length })}
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        / {t("automation.conditionCount", { count: a.conditions.length })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
                          statusCls.border,
                          statusCls.bg,
                          statusCls.text,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", statusCls.dot)} />
                        {t(`automation.status.${a.status}`)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {a.runs.total > 0 ? (
                        <span
                          className={cn(
                            "text-sm font-medium",
                            rate >= 95
                              ? "text-success"
                              : rate >= 80
                                ? "text-amber"
                                : "text-rose",
                          )}
                        >
                          {rate}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal text-xs leading-tight text-muted-foreground">
                      {a.runs.lastRunAt ? relativeTime(a.runs.lastRunAt, locale) : t("automation.neverRun")}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      v{a.version}
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <Switch
                          checked={a.status === "active"}
                          onCheckedChange={() => onToggle(a.id)}
                          aria-label={t("automation.toggle.activate")}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onToggle(a.id)}
                          title={a.status === "active" ? t("automation.toggle.pause") : t("automation.toggle.activate")}
                          aria-label={a.status === "active" ? t("automation.toggle.pause") : t("automation.toggle.activate")}
                        >
                          {a.status === "active" ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onEdit(a.id)}
                          title={t("automation.edit")}
                          aria-label={t("automation.edit")}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
              {automations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    {t("automation.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}

export default AutomationsListView;
