"use client";

/**
 * HistoryView — table of past audit runs.
 *
 * Columns: date + label, mode, QV, overall score (badge), 6 per-category
 * mini-bars, score version. Row click → view that report (calls `onSelect`).
 * "Start new audit" button switches to the questionnaire tab.
 */

import { motion } from "framer-motion";
import { History, Plus, FileText } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { CATEGORY_LIST, type AuditRunSummary } from "../types";
import { listRunSummaries } from "../data";
import { ScoreBadge, TONE_COLOR } from "./shared";

interface Props {
  onSelect: (id: string) => void;
  onStartNew: () => void;
  /** Optional override of the run list (otherwise uses data.ts). */
  runs?: AuditRunSummary[];
}

export function HistoryView({ onSelect, onStartNew, runs }: Props) {
  const { t, locale } = useLocale();
  const list = runs ?? listRunSummaries();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <History className="h-4 w-4 text-rose" />
            {t("audit.history.title")}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t("audit.history.sub")}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onStartNew}
          className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("audit.action.startNew")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60">
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="text-[11px]">{t("audit.history.colDate")}</TableHead>
                <TableHead className="text-[11px]">{t("audit.history.colMode")}</TableHead>
                <TableHead className="text-[11px]">{t("audit.history.colOverall")}</TableHead>
                {CATEGORY_LIST.map((c) => (
                  <TableHead key={c.id} className="hidden text-[11px] md:table-cell">
                    <span
                      className="inline-flex items-center gap-1"
                      style={{ color: TONE_COLOR[c.accent] }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: TONE_COLOR[c.accent] }}
                      />
                      {t(c.nameKey)}
                    </span>
                  </TableHead>
                ))}
                <TableHead className="hidden text-[11px] sm:table-cell">{t("audit.history.colScoreVersion")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-xs text-muted-foreground">
                    {t("audit.history.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                list.map((r, idx) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: idx * 0.02 }}
                    className="group cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/30"
                    onClick={() => onSelect(r.id)}
                  >
                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {formatDateTime(r.createdAt, locale)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {relativeTime(r.createdAt, locale)} ·{" "}
                          {r.label ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          r.mode === "demo"
                            ? "border-cyan/30 bg-cyan/10 text-cyan"
                            : "border-rose/30 bg-rose/10 text-rose",
                        )}
                      >
                        {r.mode === "demo"
                          ? t("audit.mode.demo")
                          : t("audit.mode.current")}
                      </span>
                    </TableCell>
                    <TableCell className="align-top">
                      <ScoreBadge score={r.overall} />
                    </TableCell>
                    {CATEGORY_LIST.map((c) => {
                      const s = r.categories[c.id] ?? 0;
                      return (
                        <TableCell key={c.id} className="hidden align-top md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${s}%`,
                                  background: TONE_COLOR[c.accent],
                                }}
                              />
                            </div>
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {s}
                            </span>
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="hidden align-top sm:table-cell">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {r.scoreVersion}
                      </span>
                    </TableCell>
                    <TableCell className="align-top">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
