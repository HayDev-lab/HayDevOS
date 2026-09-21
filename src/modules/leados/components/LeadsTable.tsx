"use client";

/**
 * LeadOS — Leads table.
 *
 * Rich data table of leads with columns: name, company, source (badge), stage
 * (color-coded badge), owner (avatar), value, SLA status (color-coded), last
 * activity (relative time). Features: search filter, stage filter (select),
 * source filter (select), sortable columns, row click → opens LeadDetail
 * drawer (calls onSelectLead).
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Inbox,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { formatCurrency, relativeTime, type StatusTone } from "@/lib/utils";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  allLeads,
  LEAD_STAGES,
  LEAD_SOURCES,
  STAGE_BY_ID,
  SOURCE_BY_ID,
  getSlaStatus,
  type SlaStatus,
  type MockLead,
  type LeadStage,
  type LeadSource,
} from "../data";
import { StageBadge, SourceBadge, OwnerAvatar, SlaBadge } from "./shared";

type SortKey = "name" | "company" | "value" | "lastActivity" | "stage";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
  return dir === "asc" ? (
    <ArrowUp className="h-3 w-3 text-lime" />
  ) : (
    <ArrowDown className="h-3 w-3 text-lime" />
  );
}

interface LeadsTableProps {
  /** Called when a row is clicked. */
  onSelectLead?: (lead: MockLead) => void;
  /** Optional external search query (from the LeadOSView toolbar). */
  externalQuery?: string;
  /** Cap the number of rows shown (default 15). */
  limit?: number;
}

export function LeadsTable({ onSelectLead, externalQuery, limit = 15 }: LeadsTableProps) {
  const { t, locale } = useLocale();
  const [internalQuery, setInternalQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<LeadStage | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastActivity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const query = (externalQuery ?? internalQuery).trim().toLowerCase();

  const filtered = useMemo(() => {
    let result = allLeads;
    if (query) {
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          (l.company ?? "").toLowerCase().includes(query) ||
          (l.email ?? "").toLowerCase().includes(query),
      );
    }
    if (stageFilter !== "all") {
      result = result.filter((l) => l.stage === stageFilter);
    }
    if (sourceFilter !== "all") {
      result = result.filter((l) => l.source === sourceFilter);
    }
    const dir = sortDir === "asc" ? 1 : -1;
    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "company":
          return (a.company ?? "").localeCompare(b.company ?? "") * dir;
        case "value":
          return (a.value - b.value) * dir;
        case "stage": {
          const ai = LEAD_STAGES.findIndex((s) => s.id === a.stage);
          const bi = LEAD_STAGES.findIndex((s) => s.id === b.stage);
          return (ai - bi) * dir;
        }
        case "lastActivity":
        default:
          return (
            (new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime()) * dir
          );
      }
    });
    return result.slice(0, limit);
  }, [query, stageFilter, sourceFilter, sortKey, sortDir, limit]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <Card className="surface-elevated gap-0 overflow-hidden py-0">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={internalQuery}
            onChange={(e) => setInternalQuery(e.target.value)}
            placeholder={t("leados.search.placeholder")}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as LeadStage | "all")}>
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue placeholder={t("leados.table.filterStage")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("leados.table.allStages")}</SelectItem>
              {LEAD_STAGES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {t(s.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as LeadSource | "all")}>
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue placeholder={t("leados.table.filterSource")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("leados.table.allSources")}</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {t(s.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[560px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("name")}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("leados.table.name")}
                  <SortIcon active={sortKey === "name"} dir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("company")}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("leados.table.company")}
                  <SortIcon active={sortKey === "company"} dir={sortDir} />
                </button>
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("leados.table.source")}
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("stage")}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("leados.table.stage")}
                  <SortIcon active={sortKey === "stage"} dir={sortDir} />
                </button>
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("leados.table.owner")}
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("value")}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("leados.table.value")}
                  <SortIcon active={sortKey === "value"} dir={sortDir} />
                </button>
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("leados.table.sla")}
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("lastActivity")}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("leados.table.lastActivity")}
                  <SortIcon active={sortKey === "lastActivity"} dir={sortDir} />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((lead, i) => {
              const sla = getSlaStatus(lead);
              return (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, delay: Math.min(i * 0.015, 0.2) }}
                  onClick={() => onSelectLead?.(lead)}
                  className="cursor-pointer border-border transition-colors hover:bg-muted/40"
                >
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{lead.name}</span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{lead.email}</p>
                  </TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground">
                    {lead.company ?? "—"}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <SourceBadge source={lead.source} />
                  </TableCell>
                  <TableCell className="py-2.5">
                    <StageBadge stage={lead.stage} />
                  </TableCell>
                  <TableCell className="py-2.5">
                    <OwnerAvatar ownerId={lead.ownerId} size="xs" />
                  </TableCell>
                  <TableCell className="py-2.5 text-sm font-medium text-foreground">
                    {formatCurrency(lead.value, lead.currency)}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <SlaBadge
                      status={sla}
                      label={t(`leados.sla.${sla === "on-track" ? "onTrack" : sla === "warning" ? "warning" : "breach"}`)}
                    />
                  </TableCell>
                  <TableCell className="py-2.5 text-[11px] text-muted-foreground">
                    {relativeTime(lead.lastActivityAt, locale)}
                  </TableCell>
                </motion.tr>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <Inbox className="h-6 w-6 opacity-50" />
                    {t("misc.noResults")}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>
          {filtered.length} / {allLeads.length}
        </span>
        <span>
          {stageFilter !== "all" ? t(STAGE_BY_ID[stageFilter as LeadStage].labelKey) : t("leados.table.allStages")}
          {" · "}
          {sourceFilter !== "all" ? t(SOURCE_BY_ID[sourceFilter as LeadSource].labelKey) : t("leados.table.allSources")}
        </span>
      </div>
    </Card>
  );
}

export type { LeadsTableProps, SlaStatus };
export type SlaTone = StatusTone;
