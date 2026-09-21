"use client";

/**
 * AutomationsListView — table of every automation with status pill, success
 * rate, version, last run + an enabled switch. Row click → Builder.
 */

import { motion } from "framer-motion";
import { Plus, ArrowRight, Zap, Pause, Play, Edit3 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { cn, relativeTime, toneClasses, statusColor } from "@/lib/utils";
import type { Automation } from "../types";
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
import { ScrollArea } from "@/components/ui/scroll-area";

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

      <div className="rounded-xl border border-border bg-card/40">
        <ScrollArea className="max-h-[640px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[34%]">{t("automation.col.name")}</TableHead>
                <TableHead>{t("automation.col.trigger")}</TableHead>
                <TableHead className="text-center">{t("automation.col.actions")}</TableHead>
                <TableHead>{t("automation.col.status")}</TableHead>
                <TableHead className="text-right">{t("automation.col.successRate")}</TableHead>
                <TableHead>{t("automation.col.lastRun")}</TableHead>
                <TableHead className="text-center">{t("automation.col.version")}</TableHead>
                <TableHead className="text-center">{t("automation.col.enabled")}</TableHead>
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
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">{a.name}</span>
                        {a.description && (
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {a.description}
                          </span>
                        )}
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          {a.dedupKey}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 border-border bg-muted/40 text-xs">
                        <Zap className="h-3 w-3 text-cyan" />
                        {a.trigger.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-foreground">{a.actions.length}</span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        / {a.conditions.length}c
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
                    <TableCell className="text-xs text-muted-foreground">
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
                      <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-2 text-xs"
                          onClick={() => onToggle(a.id)}
                        >
                          {a.status === "active" ? (
                            <>
                              <Pause className="h-3.5 w-3.5" /> {t("automation.toggle.pause")}
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5" /> {t("automation.toggle.activate")}
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-2 text-xs"
                          onClick={() => onEdit(a.id)}
                        >
                          <Edit3 className="h-3.5 w-3.5" /> {t("automation.edit")}
                          <ArrowRight className="h-3 w-3" />
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
        </ScrollArea>
      </div>
    </div>
  );
}

export default AutomationsListView;
