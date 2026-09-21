"use client";

/**
 * LeadOS — Lead detail Sheet (right-side).
 *
 * Header (name, company, stage badge, value), contact info, attribution
 * (source, campaign), SLA timers (first response, follow-up), activity
 * timeline, tasks list (with complete checkbox), notes, and an "AI Lead
 * Agent" mini-panel with buttons: Analyze, Qualify, Summarize, Next-best-action.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  Building2,
  Globe,
  Tag,
  Clock,
  CheckCircle2,
  Sparkles,
  Wand2,
  Send,
  Gauge,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import {
  cn,
  formatCurrency,
  formatDateTime,
  relativeTime,
  toneClasses,
} from "@/lib/utils";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import {
  allActivities,
  mockTasks,
  STAGE_BY_ID,
  SOURCE_BY_ID,
  TEAM_BY_ID,
  getSlaStatus,
  SLA_POLICIES,
  type MockLead,
  type LeadStage,
} from "../data";
import {
  StageBadge,
  SourceBadge,
  OwnerAvatar,
  SlaBadge,
  activityTone,
} from "./shared";

interface LeadDetailProps {
  lead: MockLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageChange?: (leadId: string, newStage: LeadStage) => void;
}

type AiAction = "analyze" | "qualify" | "summarize" | "nextAction";

const AI_RESULTS: Record<AiAction, { titleKey: string; body: string; tone: "lime" | "cyan" | "amber" | "violet" }> = {
  analyze: {
    titleKey: "leados.ai.analyze",
    body:
      "Lead shows strong buying signals: repeat visits to /pricing, downloaded ROI calculator, engaged with 3 product emails. Champion is Head of Ops with budget authority. Risk: data residency question still open.",
    tone: "cyan",
  },
  qualify: {
    titleKey: "leados.ai.qualify",
    body:
      "BANT score: 78/100. Budget: ✓ confirmed ($48K+). Authority: ✓ (Head of Ops). Need: ✓ workflow automation for finance. Timeline: ⚠ 30-45 days — push for a workshop this week to lock in.",
    tone: "lime",
  },
  summarize: {
    titleKey: "leados.ai.summarize",
    body:
      "3-week engagement. Discovery call covered SSO + EU residency. Pricing PDF + ROI calculator sent. Currently in Qualified — needs proposal with multi-year discount + onboarding package to advance to Proposal.",
    tone: "amber",
  },
  nextAction: {
    titleKey: "leados.ai.nextAction",
    body:
      "Recommended next step: send a tailored 12-month proposal with 10% multi-year discount and book a 30-min technical deep-dive with their engineering lead within 48h. Owner should CC the CFO.",
    tone: "violet",
  },
};

export function LeadDetail({ lead, open, onOpenChange, onStageChange }: LeadDetailProps) {
  const { t, locale } = useLocale();
  const [aiAction, setAiAction] = useState<AiAction | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [noteText, setNoteText] = useState("");
  const [localStage, setLocalStage] = useState<LeadStage | null>(null);

  const stage = lead ? (localStage ?? lead.stage) : null;

  const activities = useMemo(() => {
    if (!lead) return [];
    return allActivities
      .filter((a) => a.leadId === lead.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [lead]);

  const tasks = useMemo(() => {
    if (!lead) return [];
    return mockTasks.filter((tk) => tk.leadId === lead.id);
  }, [lead]);

  function runAi(action: AiAction) {
    setAiLoading(true);
    setAiAction(null);
    window.setTimeout(() => {
      setAiLoading(false);
      setAiAction(action);
      toast.success(t("leados.toast.aiAnalyzed"));
    }, 700);
  }

  function toggleTask(id: string) {
    setCompletedTasks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) toast.success(t("leados.toast.taskCompleted"));
      return next;
    });
  }

  function addNote() {
    if (!noteText.trim()) return;
    toast.success(t("leados.toast.noteAdded"));
    setNoteText("");
  }

  function changeStage(newStage: LeadStage) {
    if (!lead) return;
    setLocalStage(newStage);
    onStageChange?.(lead.id, newStage);
    toast.success(
      t("leados.toast.stageMoved", {
        name: lead.name,
        stage: t(STAGE_BY_ID[newStage].labelKey),
      }),
    );
  }

  const sla = lead ? getSlaStatus(lead) : "on-track";
  const slaLabel = t(`leados.sla.${sla === "on-track" ? "onTrack" : sla === "warning" ? "warning" : "breach"}`);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-border bg-background p-0 sm:max-w-xl"
      >
        {lead && stage && (
          <>
            {/* Header */}
            <SheetHeader className="gap-0 border-b border-border p-0">
              <div className="bg-radial-glow px-5 pb-4 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-xl font-semibold tracking-tight text-foreground">
                      {lead.name}
                    </SheetTitle>
                    <SheetDescription className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      {lead.company ?? "—"}
                    </SheetDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t("leados.detail.value")}
                    </p>
                    <p className="mt-0.5 text-lg font-semibold text-lime">
                      {formatCurrency(lead.value, lead.currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StageBadge stage={stage} />
                  <SourceBadge source={lead.source} />
                  <SlaBadge status={sla} label={slaLabel} />
                  <div className="ml-auto flex items-center gap-2">
                    <OwnerAvatar ownerId={lead.ownerId} size="sm" />
                    <span className="text-xs text-muted-foreground">
                      {TEAM_BY_ID[lead.ownerId]?.name ?? lead.ownerId}
                    </span>
                  </div>
                </div>

                {/* Stage switcher */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {(Object.keys(STAGE_BY_ID) as LeadStage[]).map((s) => {
                    const def = STAGE_BY_ID[s];
                    const isActive = s === stage;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => changeStage(s)}
                        className={cn(
                          "rounded-md border px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors",
                          isActive
                            ? cn("border-current/40 bg-current/10", def.text)
                            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60",
                        )}
                      >
                        {t(def.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </SheetHeader>

            {/* Body */}
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-5 p-5">
                {/* Contact + attribution */}
                <Section title={t("leados.detail.contact")} icon={Mail}>
                  <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <InfoRow icon={Mail} label={t("leados.detail.email")} value={lead.email ?? "—"} />
                    <InfoRow icon={Phone} label={t("leados.detail.phone")} value={lead.phone ?? "—"} />
                    <InfoRow icon={Building2} label={t("leados.table.company")} value={lead.company ?? "—"} />
                    <InfoRow icon={Globe} label={t("leados.table.source")} value={t(SOURCE_BY_ID[lead.source].labelKey)} />
                  </div>
                </Section>

                <Section title={t("leados.detail.attribution")} icon={Tag}>
                  <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <InfoRow
                      icon={Tag}
                      label={t("leados.detail.campaign")}
                      value={`campaign_${lead.source}_${lead.id.slice(-2)}`}
                    />
                    <InfoRow
                      icon={Globe}
                      label={t("leados.table.source")}
                      value={t(SOURCE_BY_ID[lead.source].labelKey)}
                    />
                  </div>
                </Section>

                {/* SLA timers */}
                <Section title={t("leados.detail.slaTimers")} icon={Clock}>
                  <div className="grid grid-cols-2 gap-2">
                    <SlaTimer
                      label={t("leados.detail.firstResponse")}
                      targetHours={SLA_POLICIES.firstResponseHours}
                      value={
                        lead.firstResponseAt
                          ? relativeTime(lead.firstResponseAt, locale)
                          : t("leados.sla.warning")
                      }
                      tone={lead.firstResponseAt ? "success" : "warning"}
                    />
                    <SlaTimer
                      label={t("leados.detail.followUp")}
                      targetHours={SLA_POLICIES.followUpHours}
                      value={relativeTime(lead.lastActivityAt, locale)}
                      tone={sla === "breach" ? "destructive" : sla === "warning" ? "warning" : "success"}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {t("leados.detail.responseTime")}: {lead.firstResponseAt ? formatDateTime(lead.firstResponseAt, locale) : "—"}
                  </div>
                </Section>

                {/* Activity timeline */}
                <Section title={t("leados.detail.activity")} icon={Gauge}>
                  <ol className="relative space-y-3 border-l border-border pl-4">
                    {activities.length === 0 && (
                      <li className="text-xs text-muted-foreground">{t("common.empty")}</li>
                    )}
                    {activities.map((a) => {
                      const tone = activityTone(a.type);
                      const cls = toneClasses(tone);
                      return (
                        <li key={a.id} className="relative">
                          <span
                            className={cn(
                              "absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ring-2 ring-background",
                              cls.dot,
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              {a.type.replace("_", " ")}
                            </p>
                            <span className="text-[10px] text-muted-foreground/70">
                              {relativeTime(a.createdAt, locale)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-foreground">{a.body}</p>
                        </li>
                      );
                    })}
                  </ol>
                </Section>

                {/* Tasks */}
                <Section title={t("leados.detail.tasks")} icon={CheckCircle2}>
                  <ul className="space-y-1">
                    {tasks.length === 0 && (
                      <li className="text-xs text-muted-foreground">{t("common.empty")}</li>
                    )}
                    {tasks.map((tk) => {
                      const done = completedTasks[tk.id] ?? tk.status === "done";
                      return (
                        <li
                          key={tk.id}
                          className="flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/30"
                        >
                          <Checkbox
                            checked={done}
                            onCheckedChange={() => toggleTask(tk.id)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-sm", done ? "text-muted-foreground line-through" : "text-foreground")}>
                              {tk.title}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                              {t(`leados.tasks.priority.${tk.priority}`)} · {relativeTime(tk.dueAt, locale)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Section>

                {/* Notes */}
                <Section title={t("leados.detail.notes")} icon={Sparkles}>
                  <div className="flex items-center gap-2">
                    <Input
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder={t("leados.detail.addNote")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addNote();
                      }}
                    />
                    <Button size="sm" variant="default" onClick={addNote}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Section>

                {/* AI Lead Agent */}
                <Section
                  title={t("leados.detail.aiAgent")}
                  icon={Sparkles}
                  iconColor="text-violet"
                  right={
                    <span className="rounded-full border border-violet/30 bg-violet/10 px-2 py-0 text-[10px] uppercase tracking-wider text-violet">
                      AI
                    </span>
                  }
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <AiButton icon={Wand2} label={t("leados.ai.analyze")} onClick={() => runAi("analyze")} active={aiAction === "analyze"} />
                    <AiButton icon={Gauge} label={t("leados.ai.qualify")} onClick={() => runAi("qualify")} active={aiAction === "qualify"} />
                    <AiButton icon={Sparkles} label={t("leados.ai.summarize")} onClick={() => runAi("summarize")} active={aiAction === "summarize"} />
                    <AiButton icon={ArrowRight} label={t("leados.ai.nextAction")} onClick={() => runAi("nextAction")} active={aiAction === "nextAction"} />
                  </div>

                  <div className="mt-3 min-h-[88px] rounded-lg border border-border bg-muted/30 p-3">
                    {aiLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                          className="inline-block h-3.5 w-3.5 rounded-full border-2 border-violet border-t-transparent"
                        />
                        {t("leados.ai.thinking")}
                      </div>
                    ) : aiAction ? (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1.5"
                      >
                        <p className={cn("text-[10px] font-semibold uppercase tracking-wider", toneClasses(AI_RESULTS[aiAction].tone).text)}>
                          {t(AI_RESULTS[aiAction].titleKey)}
                        </p>
                        <p className="text-sm leading-relaxed text-foreground">
                          {AI_RESULTS[aiAction].body}
                        </p>
                      </motion.div>
                    ) : (
                      <p className="text-xs text-muted-foreground/70">{t("leados.ai.empty")}</p>
                    )}
                  </div>
                </Section>

                <Separator />
                <div className="pb-4 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  {lead.id} · {t("leados.table.lastActivity")}: {relativeTime(lead.lastActivityAt, locale)}
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  iconColor = "text-lime",
  right,
  children,
}: {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      {children}
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SlaTimer({
  label,
  targetHours,
  value,
  tone,
}: {
  label: string;
  targetHours: number;
  value: string;
  tone: "success" | "warning" | "destructive";
}) {
  const cls = toneClasses(tone);
  return (
    <div className={cn("rounded-md border px-3 py-2", cls.border, cls.bg)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot)} />
      </div>
      <p className={cn("mt-1 text-sm font-medium", cls.text)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
        target {targetHours}h
      </p>
    </div>
  );
}

function AiButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors",
        active
          ? "border-violet/40 bg-violet/10 text-violet"
          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{label}</span>
    </button>
  );
}
