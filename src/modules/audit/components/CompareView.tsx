"use client";

/**
 * CompareView — compare past audits over time.
 *
 * Inputs: a list of past runs (oldest-first for trend clarity).
 *
 * Layout:
 *  - Run selector chips (2–4 selection).
 *  - Line chart — overall score trend across the selected runs.
 *  - Radar chart — category scores across the selected runs.
 *  - Delta table — per-category improvement / decline between the first and
 *    last selected run.
 *
 * No fake ROI — only deterministic deltas derived from the historical score
 * values. Score versions are surfaced so the user can spot when the
 * questionnaire was upgraded.
 */

import { GitCompare,Minus,TrendingDown,TrendingUp } from "lucide-react";
import { useMemo,useState } from "react";
import {
CartesianGrid,
Legend,
Line,
LineChart,
PolarAngleAxis,
PolarGrid,
PolarRadiusAxis,
Radar,
RadarChart,
ResponsiveContainer,
Tooltip,
XAxis,
YAxis,
} from "recharts";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocale } from "@/lib/i18n";
import { cn,formatDate } from "@/lib/utils";

import { listRunSummaries } from "../data";
import { CATEGORY_LIST,type AuditRunSummary } from "../types";
import { TONE_COLOR } from "./shared";

interface Props {
  runs?: AuditRunSummary[];
}

const MAX_SELECTION = 4;

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--popover-foreground)",
    fontSize: "12px",
    boxShadow: "0 8px 24px -12px rgba(0,0,0,0.6)",
  },
  labelStyle: { color: "var(--muted-foreground)", fontWeight: 600 },
  itemStyle: { color: "var(--foreground)" },
} as const;

const RUN_COLORS = [
  "var(--accent-lime)",
  "var(--accent-cyan)",
  "var(--accent-amber)",
  "var(--accent-violet)",
];

export function CompareView({ runs }: Props) {
  const { t, locale } = useLocale();

  const all = useMemo(() => runs ?? listRunSummaries(), [runs]);
  // Pre-select the most recent 3 (in list order — list is newest-first).
  const initialIds = useMemo(
    () => all.slice(0, 3).map((r) => r.id),
    [all],
  );
  const [selected, setSelected] = useState<string[]>(initialIds);

  const selectedRuns = useMemo(
    () =>
      selected
        .map((id) => all.find((r) => r.id === id))
        .filter((r): r is AuditRunSummary => Boolean(r))
        // oldest-first for the trend line
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [selected, all],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        // Keep at least 2 selected so the delta + radar make sense.
        if (prev.length <= 2) return prev;
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, id];
    });
  }

  // Trend line data — one row per selected run, with overall + each category.
  const trendData = useMemo(
    () =>
      selectedRuns.map((r) => ({
        label: formatDate(r.createdAt, locale),
        overall: r.overall,
        ...Object.fromEntries(
          CATEGORY_LIST.map((c) => [c.id, r.categories[c.id] ?? 0]),
        ),
      })),
    [selectedRuns, locale],
  );

  // Radar data — one row per category, one column per run.
  const radarData = useMemo(
    () =>
      CATEGORY_LIST.map((c) => {
        const row: Record<string, string | number> = {
          category: t(c.nameKey),
        };
        selectedRuns.forEach((r, idx) => {
          row[`run${idx}`] = r.categories[c.id] ?? 0;
        });
        return row;
      }),
    [selectedRuns, t],
  );

  // Delta table — first → last selected run, per category + overall.
  const deltas = useMemo(() => {
    if (selectedRuns.length < 2) return [];
    const first = selectedRuns[0];
    const last = selectedRuns[selectedRuns.length - 1];
    const rows: Array<{
      label: string;
      accent: keyof typeof TONE_COLOR;
      first: number;
      last: number;
      delta: number;
    }> = [];
    rows.push({
      label: t("audit.report.overall"),
      accent: "lime",
      first: first.overall,
      last: last.overall,
      delta: last.overall - first.overall,
    });
    for (const c of CATEGORY_LIST) {
      const f = first.categories[c.id] ?? 0;
      const l = last.categories[c.id] ?? 0;
      rows.push({
        label: t(c.nameKey),
        accent: c.accent,
        first: f,
        last: l,
        delta: l - f,
      });
    }
    return rows;
  }, [selectedRuns, t]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GitCompare className="h-4 w-4 text-rose" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("audit.compare.title")}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {t("audit.compare.sub")}
          </p>
        </div>
      </div>

      {/* Run selector chips */}
      <div className="flex flex-wrap gap-1.5">
        {all.map((r) => {
          const active = selected.includes(r.id);
          const idx = selected.indexOf(r.id);
          const color = idx >= 0 ? RUN_COLORS[idx % RUN_COLORS.length] : null;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
              style={active && color ? { borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, background: `color-mix(in srgb, ${color} 10%, transparent)` } : undefined}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: color ?? "var(--muted-foreground)" }}
              />
              <span>{formatDate(r.createdAt, locale)}</span>
              {r.label ? (
                <span className="opacity-70">· {r.label}</span>
              ) : null}
              <span className="font-mono opacity-60">{r.overall}</span>
            </button>
          );
        })}
      </div>

      {selectedRuns.length < 2 ? (
        <div className="rounded-xl border border-border/60 bg-card/40 p-6 text-center text-xs text-muted-foreground">
          {t("audit.compare.minSelection")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Trend line — overall + categories */}
          <section className="surface-elevated rounded-xl border border-border/60 p-4">
            <header className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {t("audit.compare.trendTitle")}
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {t("audit.compare.trendSub")}
              </span>
            </header>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    stroke="var(--border)"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    stroke="var(--border)"
                  />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="overall"
                    name={t("audit.report.overall")}
                    stroke="var(--foreground)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                  {CATEGORY_LIST.map((c) => (
                    <Line
                      key={c.id}
                      type="monotone"
                      dataKey={c.id}
                      name={t(c.nameKey)}
                      stroke={TONE_COLOR[c.accent]}
                      strokeWidth={1.4}
                      strokeDasharray="3 3"
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Radar — per-run category comparison */}
          <section className="surface-elevated rounded-xl border border-border/60 p-4">
            <header className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {t("audit.compare.radarTitle")}
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {t("audit.compare.radarSub")}
              </span>
            </header>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                    stroke="var(--border)"
                  />
                  {selectedRuns.map((r, idx) => (
                    <Radar
                      key={r.id}
                      name={formatDate(r.createdAt, locale)}
                      dataKey={`run${idx}`}
                      stroke={RUN_COLORS[idx % RUN_COLORS.length]}
                      fill={RUN_COLORS[idx % RUN_COLORS.length]}
                      fillOpacity={0.18}
                      strokeWidth={1.6}
                      isAnimationActive={false}
                    />
                  ))}
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Legend
                    wrapperStyle={{ fontSize: 10, color: "var(--muted-foreground)" }}
                    iconType="circle"
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Delta table */}
          <section className="surface-elevated rounded-xl border border-border/60 p-4 lg:col-span-2">
            <header className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {t("audit.compare.deltaTitle")}
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {t("audit.compare.deltaSub", {
                  first: formatDate(selectedRuns[0].createdAt, locale),
                  last: formatDate(selectedRuns[selectedRuns.length - 1].createdAt, locale),
                })}
              </span>
            </header>
            <ScrollArea className="max-h-72">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 text-left font-medium">{t("audit.compare.colCategory")}</th>
                    <th className="py-2 text-right font-medium">{t("audit.compare.colFirst")}</th>
                    <th className="py-2 text-right font-medium">{t("audit.compare.colLast")}</th>
                    <th className="py-2 text-right font-medium">{t("audit.compare.colDelta")}</th>
                    <th className="py-2 text-left font-medium">{t("audit.compare.colTrend")}</th>
                  </tr>
                </thead>
                <tbody>
                  {deltas.map((d) => {
                    const up = d.delta > 0;
                    const flat = d.delta === 0;
                    return (
                      <tr key={d.label} className="border-b border-border/40">
                        <td className="py-2">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: TONE_COLOR[d.accent] }}
                            />
                            {d.label}
                          </span>
                        </td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">
                          {d.first}
                        </td>
                        <td className="py-2 text-right tabular-nums text-foreground">
                          {d.last}
                        </td>
                        <td
                          className={cn(
                            "py-2 text-right tabular-nums font-medium",
                            flat ? "text-muted-foreground" : up ? "text-lime" : "text-rose",
                          )}
                        >
                          {up ? "+" : ""}
                          {d.delta}
                        </td>
                        <td className="py-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              flat ? "text-muted-foreground" : up ? "text-lime" : "text-rose",
                            )}
                          >
                            {flat ? (
                              <Minus className="h-3 w-3" />
                            ) : up ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            <span className="text-[10px]">
                              {flat
                                ? t("audit.compare.flat")
                                : up
                                  ? t("audit.compare.improved")
                                  : t("audit.compare.declined")}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </section>
        </div>
      )}
    </div>
  );
}
