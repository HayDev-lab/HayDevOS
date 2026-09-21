"use client";

/**
 * FailedJobsView — failed executions with error messages, retry counts,
 * Retry + Cancel buttons. Filter by error type.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RotateCw, Ban, AlertOctagon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  runs: AutomationRun[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}

export function FailedJobsView({ runs, onRetry, onCancel }: Props) {
  const { t, locale } = useLocale();
  const [filter, setFilter] = useState<string>("__all");

  const errorTypes = useMemo(() => {
    const set = new Set<string>();
    runs.forEach((r) => r.errorType && set.add(r.errorType));
    return Array.from(set).sort();
  }, [runs]);

  const filtered = useMemo(
    () => (filter === "__all" ? runs : runs.filter((r) => r.errorType === filter)),
    [runs, filter],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("automation.failed.title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground/80">{t("automation.failed.sub")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("automation.failed.filter")}:</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-52 bg-card/60 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">{t("automation.failed.allErrors")}</SelectItem>
              {errorTypes.map((et) => (
                <SelectItem key={et} value={et} className="font-mono text-xs">
                  {et}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/40">
        <ScrollArea className="max-h-[640px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[26%]">{t("automation.exec.col.automation")}</TableHead>
                <TableHead>{t("automation.exec.col.started")}</TableHead>
                <TableHead>{t("automation.exec.error")}</TableHead>
                <TableHead className="text-center">{t("automation.exec.retries")}</TableHead>
                <TableHead className="text-right">{t("automation.failed.retry")} / {t("automation.failed.cancel")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, i) => {
                const cls = toneClasses(statusColor(r.status));
                return (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.2) }}
                    className="border-border transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">{r.automationName}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{r.id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{formatDateTime(r.startedAt, locale)}</div>
                      <div className="text-[10px] text-muted-foreground/70">
                        {relativeTime(r.startedAt, locale)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {r.errorType && (
                          <Badge
                            variant="outline"
                            className={cn("w-fit border-rose/30 bg-rose/10 px-1.5 py-0 text-[9px] uppercase tracking-wider text-rose", cls.border, cls.bg, cls.text)}
                          >
                            <AlertOctagon className="mr-1 h-2.5 w-2.5" />
                            {r.errorType}
                          </Badge>
                        )}
                        <span className="line-clamp-2 max-w-md text-xs text-muted-foreground">
                          {r.errorMessage ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium text-amber">{r.retryCount}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRetry(r.id)}
                          className="h-7 gap-1 px-2 text-xs"
                        >
                          <RotateCw className="h-3 w-3" />
                          {t("automation.failed.retry")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCancel(r.id)}
                          className="h-7 gap-1 px-2 text-xs text-rose hover:text-rose"
                        >
                          <Ban className="h-3 w-3" />
                          {t("automation.failed.cancel")}
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-success">
                    {t("automation.failed.empty")}
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

export default FailedJobsView;
