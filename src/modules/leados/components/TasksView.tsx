"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CheckSquare, Clock } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { relativeTime } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { useLeadOSData } from "../LeadOSData";
import { OwnerAvatar } from "./shared";

type TaskFilter = "open" | "done" | "all";

export function TasksView() {
  const { locale, t } = useLocale();
  const { overview, completeTask } = useLeadOSData();
  const [filter, setFilter] = useState<TaskFilter>("open");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const tasks = useMemo(() => overview!.tasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "done") return task.status === "done";
    return task.status !== "done" && task.status !== "cancelled";
  }), [filter, overview]);
  const breached = overview!.leads.filter((lead) => lead.sla.status === "breach").length;
  const warning = overview!.leads.filter((lead) => lead.sla.status === "warning").length;

  async function toggleTask(id: string, complete: boolean) {
    setWorkingId(id);
    try {
      await completeTask(id, complete);
      toast.success(complete ? t("leados.toast.taskCompleted") : t("leados.runtime.taskReopened"));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t("leados.runtime.taskFailed"));
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Summary icon={CheckSquare} label={t("leados.runtime.openTasks")} value={overview!.dashboard.tasksDue} />
        <Summary icon={AlertTriangle} label={t("leados.runtime.slaBreached")} value={breached} tone="text-rose" />
        <Summary icon={Clock} label={t("leados.runtime.slaWarning")} value={warning} tone="text-amber" />
      </div>

      <Card className="surface-elevated gap-0 overflow-hidden py-0">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-sm font-semibold">{t("leados.runtime.companyTasks")}</h3>
          <Select value={filter} onValueChange={(value) => setFilter(value as TaskFilter)}>
            <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="open">{t("leados.tasks.open")}</SelectItem><SelectItem value="done">{t("leados.tasks.done")}</SelectItem><SelectItem value="all">{t("leados.tasks.all")}</SelectItem></SelectContent>
          </Select>
        </div>
        <ul className="divide-y divide-border">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 p-4">
              <OwnerAvatar ownerId={task.assigneeId} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="truncate text-xs text-muted-foreground">{task.leadName ?? t("leados.runtime.general")}{task.dueAt ? ` · ${t("leados.runtime.due")} ${relativeTime(task.dueAt, locale)}` : ""}</p>
              </div>
              <Badge variant="outline">{t(`leados.tasks.priority.${task.priority}`)}</Badge>
              <Button size="sm" variant={task.status === "done" ? "outline" : "default"} disabled={workingId === task.id} onClick={() => void toggleTask(task.id, task.status !== "done")}>
                <CheckCircle2 className="h-3.5 w-3.5" />{task.status === "done" ? t("leados.runtime.reopen") : t("leados.runtime.complete")}
              </Button>
            </li>
          ))}
          {tasks.length === 0 ? <li className="p-10 text-center text-sm text-muted-foreground">{t("leados.runtime.noTasksView")}</li> : null}
        </ul>
      </Card>
    </div>
  );
}

function Summary({ icon: Icon, label, value, tone = "text-lime" }: { icon: typeof CheckSquare; label: string; value: number; tone?: string }) {
  return <Card className="surface-elevated flex-row items-center gap-3 p-4"><Icon className={`h-5 w-5 ${tone}`} /><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold">{value}</p></div></Card>;
}
