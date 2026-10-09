"use client";

import { localizeError } from "@/lib/i18n-errors";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Clock, Mail, Phone, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { LeadDetailDto } from "@/lib/leads/types";
import { cn, formatCurrency, relativeTime } from "@/lib/utils";
import { t as translateText, useLocale } from "@/lib/i18n";
import { asLeadRecord, LEAD_STAGES, STAGE_BY_ID, type LeadRecord, type LeadStage } from "../data";
import { useLeadOSData } from "../LeadOSData";
import { OwnerAvatar, SlaBadge, SourceBadge, StageBadge } from "./shared";

interface LeadDetailProps {
  lead: LeadRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageChange?: (leadId: string, newStage: LeadStage) => Promise<void>;
}

export function LeadDetail({ lead, open, onOpenChange, onStageChange }: LeadDetailProps) {
  const { locale, t } = useLocale();
  const { getLead, addNote, completeTask } = useLeadOSData();
  const [detail, setDetail] = useState<LeadDetailDto | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!open || !lead) return;
    void getLead(lead.id).then((next) => {
      if (!cancelled) setDetail(next);
    }).catch((cause) => {
      if (!cancelled) toast.error(cause instanceof Error ? localizeError(cause) : translateText("leados.runtime.loadFailed", locale));
    });
    return () => { cancelled = true; };
  }, [getLead, lead, locale, open]);

  async function refreshDetail() {
    if (lead) setDetail(await getLead(lead.id));
  }

  async function changeStage(stage: LeadStage) {
    if (!lead || !onStageChange) return;
    setBusy(true);
    try {
      await onStageChange(lead.id, stage);
      await refreshDetail();
      toast.success(t("leados.toast.stageMoved", { name: current?.name ?? "", stage: STAGE_BY_ID[stage].labelKey ? t(STAGE_BY_ID[stage].labelKey) : STAGE_BY_ID[stage].id }));
    } catch (cause) {
      toast.error(cause instanceof Error ? localizeError(cause) : t("leados.runtime.stageFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function submitNote() {
    if (!detail || !note.trim()) return;
    setBusy(true);
    try {
      await addNote(detail.id, note);
      setNote("");
      await refreshDetail();
      toast.success(t("leados.toast.noteAdded"));
    } catch (cause) {
      toast.error(cause instanceof Error ? localizeError(cause) : t("leados.runtime.noteFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleTask(id: string, completed: boolean) {
    setBusy(true);
    try {
      await completeTask(id, completed);
      await refreshDetail();
    } catch (cause) {
      toast.error(cause instanceof Error ? localizeError(cause) : t("leados.runtime.taskFailed"));
    } finally {
      setBusy(false);
    }
  }

  const current = detail && detail.id === lead?.id ? asLeadRecord(detail) : lead;
  const slaStatus = current?.sla.status === "target" ? "on-track" : current?.sla.status;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 border-l border-border bg-background p-0 sm:max-w-xl">
        {current ? (
          <>
            <SheetHeader className="border-b border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div><SheetTitle>{current.name}</SheetTitle><SheetDescription className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{current.company ?? "—"}</SheetDescription></div>
                <p className="text-lg font-semibold text-lime">{formatCurrency(current.value, current.currency, locale)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StageBadge stage={current.stage} /><SourceBadge source={current.source} />
                {slaStatus ? <SlaBadge status={slaStatus} label={slaStatus} /> : null}
                <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground"><OwnerAvatar ownerId={current.ownerId} />{current.owner?.name ?? t("leados.runtime.unassigned")}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {LEAD_STAGES.map((stage) => <button key={stage.id} type="button" disabled={busy || stage.id === current.stage} onClick={() => void changeStage(stage.id)} className={cn("rounded border px-2 py-1 text-[10px] uppercase", stage.id === current.stage ? "border-primary text-primary" : "border-border text-muted-foreground")}>{t(stage.labelKey)}</button>)}
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="space-y-5 p-5">
                <section className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 text-sm sm:grid-cols-2">
                  <Info icon={Mail} label={t("leados.detail.email")} value={current.email ?? "—"} />
                  <Info icon={Phone} label={t("leados.detail.phone")} value={current.phone ?? "—"} />
                  <Info icon={Clock} label={t("leados.table.lastActivity")} value={relativeTime(current.lastActivityAt, locale)} />
                  <Info icon={Clock} label={t("leados.runtime.slaDue")} value={current.slaDueAt ? relativeTime(current.slaDueAt, locale) : t("leados.runtime.completed")} />
                </section>

                <Section title={t("leados.detail.tasks")} icon={CheckCircle2}>
                  <ul className="space-y-1">
                    {detail?.tasks.map((task) => <li key={task.id} className="flex items-center gap-2 rounded-md bg-muted/30 p-2"><Checkbox disabled={busy} checked={task.status === "done"} onCheckedChange={(checked) => void toggleTask(task.id, checked === true)} /><span className={cn("text-sm", task.status === "done" && "line-through text-muted-foreground")}>{task.title}</span></li>)}
                    {detail?.tasks.length === 0 ? <li className="text-xs text-muted-foreground">{t("leados.runtime.noTasks")}</li> : null}
                  </ul>
                </Section>

                <Section title={t("leados.detail.notes")} icon={Send}>
                  <div className="mb-3 flex gap-2"><Input value={note} maxLength={5000} onChange={(event) => setNote(event.target.value)} placeholder={t("leados.runtime.addInternalNote")} /><Button disabled={busy || !note.trim()} onClick={() => void submitNote()}><Send className="h-3.5 w-3.5" /></Button></div>
                  <ul className="space-y-2">{detail?.notes.map((item) => <li key={item.id} className="rounded-md border border-border p-2 text-sm"><p>{item.body}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.author.name} · {relativeTime(item.createdAt, locale)}</p></li>)}</ul>
                </Section>

                <Section title={t("leados.detail.activity")} icon={Clock}>
                  <ol className="space-y-2">{detail?.activities.map((activity) => <li key={activity.id} className="border-l border-border pl-3"><p className="text-sm">{activity.body}</p><p className="text-[10px] uppercase text-muted-foreground">{t(`leados.activity.${activity.type.toLowerCase()}`)} · {relativeTime(activity.createdAt, locale)}</p></li>)}</ol>
                </Section>

                <Section title="Owner AI" icon={Sparkles}>
                  <p className="text-sm text-muted-foreground">{t("leados.runtime.ownerAiHint")}</p>
                </Section>
              </div>
            </ScrollArea>
          </>
        ) : <div className="p-6 text-sm text-muted-foreground">{t("leados.runtime.loadingLead")}</div>}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Clock; children: React.ReactNode }) {
  return <section><h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="h-3.5 w-3.5" />{title}</h3>{children}</section>;
}

function Info({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return <div className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-muted-foreground" /><div><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="break-all">{value}</p></div></div>;
}
