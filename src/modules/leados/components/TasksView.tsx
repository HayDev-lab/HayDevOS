"use client";

/**
 * LeadOS — Tasks & SLA trackers tab.
 *
 * Three sub-panels:
 *  1. Task list with filters (status, assignee, priority)
 *  2. First-response SLA tracker (leads still awaiting first contact)
 *  3. Follow-up SLA tracker (leads needing next activity)
 *  4. Stage inactivity list (leads stuck in same stage > 7 days)
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Hourglass,
  Mail,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, relativeTime, formatDateTime, toneClasses } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  mockTasks,
  TEAM_MEMBERS,
  TEAM_BY_ID,
  STAGE_BY_ID,
  getSlaStatus,
  SLA_POLICIES,
  type TaskPriority,
  type TaskStatus,
  type MockLead,
} from "../data";
import { StageBadge, OwnerAvatar } from "./shared";
import type { LucideIcon } from "lucide-react";

const PRIORITY_TONE: Record<TaskPriority, "rose" | "amber" | "cyan"> = {
  high: "rose",
  medium: "amber",
  low: "cyan",
};

export function TasksView() {
  const { t, locale } = useLocale();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("open");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>({});

  const filteredTasks = useMemo(() => {
    return mockTasks.filter((tk) => {
      if (statusFilter !== "all") {
        const done = doneTasks[tk.id] ?? tk.status === "done";
        const effectiveStatus: TaskStatus = done ? "done" : "open";
        if (effectiveStatus !== statusFilter) return false;
      }
      if (assigneeFilter !== "all" && tk.ownerId !== assigneeFilter) return false;
      if (priorityFilter !== "all" && tk.priority !== priorityFilter) return false;
      return true;
    });
  }, [statusFilter, assigneeFilter, priorityFilter, doneTasks]);

  function toggleTask(id: string) {
    setDoneTasks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) toast.success(t("leados.toast.taskCompleted"));
      return next;
    });
  }

  // First-response SLA tracker: leads with firstResponseAt === null
  const firstResponseSla = useMemo(
    () => allLeads.filter((l) => !l.firstResponseAt && !STAGE_BY_ID[l.stage].closed),
    [],
  );

  // Follow-up SLA tracker: leads whose lastActivityAt > followUpHours ago
  const followUpSla = useMemo(() => {
    const cutoff = Date.now() - SLA_POLICIES.followUpHours * 3600000;
    return allLeads.filter(
      (l) => !STAGE_BY_ID[l.stage].closed && new Date(l.lastActivityAt).getTime() < cutoff,
    );
  }, []);

  // Stage inactivity: leads whose updatedAt > stageInactivityDays ago
  const stageInactivity = useMemo(() => {
    const cutoff = Date.now() - SLA_POLICIES.stageInactivityDays * 86400000;
    return allLeads.filter(
      (l) => !STAGE_BY_ID[l.stage].closed && new Date(l.updatedAt).getTime() < cutoff,
    );
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Task list */}
      <Card className="surface-elevated gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-lime" />
            <h3 className="text-sm font-semibold text-foreground">{t("leados.tasks.title")}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | "all")}>
              <SelectTrigger size="sm" className="w-[120px]">
                <SelectValue placeholder={t("leados.tasks.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("leados.tasks.all")}</SelectItem>
                <SelectItem value="open">{t("leados.tasks.open")}</SelectItem>
                <SelectItem value="done">{t("leados.tasks.done")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger size="sm" className="w-[160px]">
                <SelectValue placeholder={t("leados.tasks.filterAssignee")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("leados.tasks.all")}</SelectItem>
                {TEAM_MEMBERS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TaskPriority | "all")}>
              <SelectTrigger size="sm" className="w-[120px]">
                <SelectValue placeholder={t("leados.tasks.filterPriority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("leados.tasks.all")}</SelectItem>
                <SelectItem value="high">{t("leados.tasks.priority.high")}</SelectItem>
                <SelectItem value="medium">{t("leados.tasks.priority.medium")}</SelectItem>
                <SelectItem value="low">{t("leados.tasks.priority.low")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="max-h-[420px]">
          <ul className="divide-y divide-border">
            {filteredTasks.map((tk, i) => {
              const done = doneTasks[tk.id] ?? tk.status === "done";
              const overdue = new Date(tk.dueAt).getTime() < Date.now() && !done;
              const tone = PRIORITY_TONE[tk.priority];
              const cls = toneClasses(tone);
              return (
                <motion.li
                  key={tk.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, delay: Math.min(i * 0.015, 0.2) }}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <Checkbox checked={done} onCheckedChange={() => toggleTask(tk.id)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", done ? "text-muted-foreground line-through" : "text-foreground")}>
                      {tk.title}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {tk.leadName} · {TEAM_BY_ID[tk.ownerId]?.name ?? tk.ownerId}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("border px-1.5 py-0 text-[10px] uppercase tracking-wider", cls.border, cls.bg, cls.text)}
                  >
                    {t(`leados.tasks.priority.${tk.priority}`)}
                  </Badge>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] uppercase tracking-wider",
                      overdue ? "text-rose" : "text-muted-foreground/70",
                    )}
                  >
                    {overdue
                      ? t("leados.tasks.overdueBy", {
                          n: Math.round((Date.now() - new Date(tk.dueAt).getTime()) / 3600000),
                        })
                      : t("leados.tasks.dueIn", {
                          n: Math.round(Math.abs(new Date(tk.dueAt).getTime() - Date.now()) / 3600000),
                        })}
                  </span>
                </motion.li>
              );
            })}
            {filteredTasks.length === 0 && (
              <li className="flex flex-col items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
                <Inbox className="h-5 w-5 opacity-50" />
                {t("common.empty")}
              </li>
            )}
          </ul>
        </ScrollArea>
      </Card>

      {/* SLA trackers grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SlaTrackerCard
          title={t("leados.tasks.firstResponseSla")}
          icon={Mail}
          iconColor="text-cyan"
          leads={firstResponseSla}
          locale={locale}
          emptyText={t("common.empty")}
          slaKind="firstResponse"
          t={t}
        />
        <SlaTrackerCard
          title={t("leados.tasks.followUpSla")}
          icon={Clock}
          iconColor="text-amber"
          leads={followUpSla}
          locale={locale}
          emptyText={t("common.empty")}
          slaKind="followUp"
          t={t}
        />
      </div>

      {/* Stage inactivity */}
      <SlaTrackerCard
        title={t("leados.tasks.stageInactivity")}
        icon={Hourglass}
        iconColor="text-violet"
        leads={stageInactivity}
        locale={locale}
        emptyText={t("common.empty")}
        slaKind="inactivity"
        t={t}
        fullWidth
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLA tracker card (table of leads with SLA breakdown)
// ─────────────────────────────────────────────────────────────────────────────

function SlaTrackerCard({
  title,
  icon: Icon,
  iconColor,
  leads,
  locale,
  emptyText,
  slaKind,
  t,
  fullWidth,
}: {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  leads: MockLead[];
  locale: string;
  emptyText: string;
  slaKind: "firstResponse" | "followUp" | "inactivity";
  t: (key: string, params?: Record<string, string | number>) => string;
  fullWidth?: boolean;
}) {
  return (
    <Card className={cn("surface-elevated gap-0 overflow-hidden py-0", fullWidth && "lg:col-span-2")}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", iconColor)} />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <span className="rounded-full bg-muted/60 px-2 py-0 text-[10px] text-muted-foreground">
          {leads.length}
        </span>
      </div>
      <CardContent className="p-0">
        <div className="max-h-[320px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.table.name")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.table.stage")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.table.owner")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.table.lastActivity")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.table.sla")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const sla = getSlaStatus(lead);
                const slaTone = sla === "breach" ? "destructive" : sla === "warning" ? "warning" : "success";
                const cls = toneClasses(slaTone);
                const target = slaKind === "firstResponse" ? SLA_POLICIES.firstResponseHours : slaKind === "followUp" ? SLA_POLICIES.followUpHours : SLA_POLICIES.stageInactivityDays * 24;
                const overdueHours = slaKind === "firstResponse"
                  ? Math.round((Date.now() - new Date(lead.createdAt).getTime()) / 3600000)
                  : Math.round((Date.now() - new Date(lead.lastActivityAt).getTime()) / 3600000);
                return (
                  <TableRow key={lead.id} className="border-border">
                    <TableCell className="py-2">
                      <p className="text-sm font-medium text-foreground">{lead.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{lead.company}</p>
                    </TableCell>
                    <TableCell className="py-2">
                      <StageBadge stage={lead.stage} />
                    </TableCell>
                    <TableCell className="py-2">
                      <OwnerAvatar ownerId={lead.ownerId} size="xs" />
                    </TableCell>
                    <TableCell className="py-2 text-[11px] text-muted-foreground">
                      {slaKind === "inactivity" ? formatDateTime(lead.updatedAt, locale) : relativeTime(lead.lastActivityAt, locale)}
                      <span className="block text-[10px] text-muted-foreground/60">
                        {overdueHours > target
                          ? t("leados.tasks.overdueBy", { n: overdueHours - target })
                          : t("leados.tasks.dueIn", { n: target - overdueHours })}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider", cls.text)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot)} />
                        {sla === "breach" ? t("leados.sla.breach") : sla === "warning" ? t("leados.sla.warning") : t("leados.sla.onTrack")}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {leads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-success" />
                      {emptyText}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
