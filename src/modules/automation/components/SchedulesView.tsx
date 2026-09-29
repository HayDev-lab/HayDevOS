"use client";

/**
 * SchedulesView — scheduled automations + simple cron builder.
 * Cron preview reflects the chosen every-N minutes/hours/days.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, CalendarClock, Pause, Play } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { cn, formatDateTime, relativeTime, toneClasses, statusColor } from "@/lib/utils";
import type { Schedule } from "../types";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  schedules: Schedule[];
  onUpdate: (s: Schedule[]) => void;
}

type Unit = "minutes" | "hours" | "days";

function cronFrom(unit: Unit, value: number, atTime: string): string {
  const [hh, mm] = atTime.split(":").map((s) => s.trim());
  switch (unit) {
    case "minutes":
      return `*/${Math.max(1, value)} * * * *`;
    case "hours":
      return `${mm ?? "0"} */${Math.max(1, value)} * * *`;
    case "days":
      return `${mm ?? "0"} ${hh ?? "9"} * * *`;
  }
}

export function SchedulesView({ schedules, onUpdate }: Props) {
  const { t, locale } = useLocale();

  // Cron builder state
  const [unit, setUnit] = useState<Unit>("minutes");
  const [value, setValue] = useState<number>(5);
  const [atTime, setAtTime] = useState<string>("09:00");

  const previewCron = useMemo(() => cronFrom(unit, value, atTime), [unit, value, atTime]);

  function toggleSchedule(id: string) {
    onUpdate(
      schedules.map((s) =>
        s.id === id
          ? { ...s, status: s.status === "active" ? "paused" : "active" }
          : s,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("automation.schedules.title")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground/80">{t("automation.schedules.sub")}</p>
      </div>

      {/* Cron builder */}
      <Card className="surface-elevated py-0">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-cyan" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("automation.schedules.builder")}
            </h3>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("automation.schedules.every")}
              </Label>
              <Input
                type="number"
                min={1}
                max={59}
                value={value}
                onChange={(e) => setValue(Math.max(1, Number(e.target.value) || 1))}
                className="mt-1 h-9 w-24 bg-card/60"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">&nbsp;</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
                <SelectTrigger className="mt-1 h-9 w-36 bg-card/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">{t("automation.schedules.minutes")}</SelectItem>
                  <SelectItem value="hours">{t("automation.schedules.hours")}</SelectItem>
                  <SelectItem value="days">{t("automation.schedules.days")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {unit !== "minutes" && (
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("automation.schedules.atTime")}
                </Label>
                <Input
                  type="time"
                  value={atTime}
                  onChange={(e) => setAtTime(e.target.value)}
                  className="mt-1 h-9 w-28 bg-card/60"
                />
              </div>
            )}
            <div className="ml-auto flex flex-col items-end gap-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("automation.schedules.preview")}
              </Label>
              <code className="rounded-md border border-cyan/30 bg-cyan/10 px-2.5 py-1.5 font-mono text-sm text-cyan">
                {previewCron}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedules table */}
      <div className="rounded-xl border border-border bg-card/40">
        <ScrollArea className="max-h-[480px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[28%]">{t("automation.schedules.col.automation")}</TableHead>
                <TableHead>{t("automation.schedules.col.cron")}</TableHead>
                <TableHead>{t("automation.schedules.col.next")}</TableHead>
                <TableHead>{t("automation.schedules.col.last")}</TableHead>
                <TableHead className="text-right">{t("automation.schedules.col.duration")}</TableHead>
                <TableHead>{t("automation.schedules.col.status")}</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s, i) => {
                const tone = statusColor(s.status);
                const cls = toneClasses(tone);
                return (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.2) }}
                    className="border-border transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">{s.automationName}</span>
                        <span className="text-[10px] text-muted-foreground">{s.timezone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="rounded-md border border-border bg-background/40 px-2 py-0.5 font-mono text-xs text-cyan">
                        {s.cron}
                      </code>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{formatDateTime(s.nextRunAt, locale)}</div>
                      <div className="text-[10px] text-muted-foreground/70">
                        {relativeTime(s.nextRunAt, locale)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.lastRunAt ? relativeTime(s.lastRunAt, locale) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {s.lastDurationMs > 0 ? `${s.lastDurationMs} ${t("automation.analytics.milliseconds")}` : "—"}
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
                        <Clock className="h-3 w-3" />
                        {t(`automation.status.${s.status}`)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 px-2 text-xs"
                        onClick={() => toggleSchedule(s.id)}
                      >
                        {s.status === "active" ? (
                          <>
                            <Pause className="h-3.5 w-3.5" /> {t("automation.toggle.pause")}
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" /> {t("automation.toggle.activate")}
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </motion.tr>
                );
              })}
              {schedules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    {t("automation.schedules.empty")}
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

export default SchedulesView;
