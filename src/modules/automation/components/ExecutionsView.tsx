"use client";

/**
 * ExecutionsView — runs table with status pills, trigger source, causation id.
 * Row click → ExecutionDetail drawer (timeline stepper + JSON payloads).
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/lib/i18n";
import { cn, formatDateTime, relativeTime, toneClasses, statusColor } from "@/lib/utils";
import type { AutomationRun } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ExecutionDetail } from "./ExecutionDetail";

interface Props {
  runs: AutomationRun[];
}

export function ExecutionsView({ runs }: Props) {
  const { t, locale } = useLocale();
  const [selected, setSelected] = useState<AutomationRun | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("automation.exec.title")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground/80">{t("automation.exec.sub")}</p>
      </div>

      <div className="rounded-xl border border-border bg-card/40">
        <ScrollArea className="max-h-[640px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[28%]">{t("automation.exec.col.automation")}</TableHead>
                <TableHead>{t("automation.exec.col.started")}</TableHead>
                <TableHead className="text-right">{t("automation.exec.col.duration")}</TableHead>
                <TableHead>{t("automation.exec.col.status")}</TableHead>
                <TableHead>{t("automation.exec.col.trigger")}</TableHead>
                <TableHead className="text-right">{t("automation.exec.retries")}</TableHead>
                <TableHead>{t("automation.exec.col.causation")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r, i) => {
                const tone = statusColor(r.status);
                const cls = toneClasses(tone);
                return (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.2) }}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer border-border transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">
                          {r.automationName}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">{r.id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{formatDateTime(r.startedAt, locale)}</div>
                      <div className="text-[10px] text-muted-foreground/70">
                        {relativeTime(r.startedAt, locale)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {r.durationMs > 0 ? `${r.durationMs}ms` : "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
                          cls.border,
                          cls.bg,
                          cls.text,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot)} />
                        {t(`automation.run.${r.status}`)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-[11px] text-muted-foreground">
                      {r.triggerSource}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {r.retryCount > 0 ? (
                        <Badge variant="outline" className="border-amber/30 bg-amber/10 text-amber">
                          {r.retryCount}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/60">0</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate font-mono text-[10px] text-muted-foreground/80">
                      {r.causationId}
                    </TableCell>
                  </motion.tr>
                );
              })}
              {runs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    {t("common.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <ExecutionDetail run={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default ExecutionsView;
