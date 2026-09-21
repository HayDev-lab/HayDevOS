"use client";

/**
 * ExecutionDetail — drawer with the vertical timeline stepper.
 * Steps: trigger → condition(s) → action(s). Each step has status icon,
 * duration, retries, input/output JSON. Header shows causation id,
 * idempotency key, worker, heartbeat. Replay button → toast.
 */

import { motion } from "framer-motion";
import {
  Zap,
  Filter,
  Workflow as WorkflowIcon,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  Clock,
  Lock,
  RotateCw,
  Server,
  KeyRound,
  Link2,
  HeartPulse,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, formatDateTime, relativeTime, toneClasses, statusColor } from "@/lib/utils";
import type { AutomationRun, ExecutionStep, StepKind, StepStatus } from "../types";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  run: AutomationRun | null;
  onClose: () => void;
}

export function ExecutionDetail({ run, onClose }: Props) {
  const { t, locale } = useLocale();
  const open = run !== null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        {run && (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between gap-2">
                <SheetTitle className="text-base">{t("automation.exec.detail")}</SheetTitle>
                <StatusBadge status={run.status} />
              </div>
              <SheetDescription className="text-xs">
                {run.automationName} · <span className="font-mono">{run.id}</span>
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="mt-4 max-h-[calc(100vh-260px)]">
              <div className="flex flex-col gap-4 pr-2">
                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card/40 p-3 text-xs">
                  <MetaRow
                    icon={<Link2 className="h-3.5 w-3.5 text-cyan" />}
                    label={t("automation.exec.causationId")}
                    value={run.causationId}
                    mono
                  />
                  <MetaRow
                    icon={<KeyRound className="h-3.5 w-3.5 text-amber" />}
                    label={t("automation.exec.idempotency")}
                    value={run.idempotencyKey}
                    mono
                  />
                  <MetaRow
                    icon={<Server className="h-3.5 w-3.5 text-violet" />}
                    label={t("automation.exec.worker")}
                    value={run.worker}
                    mono
                  />
                  <MetaRow
                    icon={<HeartPulse className="h-3.5 w-3.5 text-rose" />}
                    label={t("automation.exec.heartbeat")}
                    value={run.heartbeatAt ? relativeTime(run.heartbeatAt, locale) : "—"}
                  />
                  <MetaRow
                    icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                    label={t("automation.exec.col.started")}
                    value={formatDateTime(run.startedAt, locale)}
                  />
                  <MetaRow
                    icon={<RotateCw className="h-3.5 w-3.5 text-muted-foreground" />}
                    label={t("automation.exec.retries")}
                    value={String(run.retryCount)}
                  />
                </div>

                {/* Trigger source */}
                <div className="rounded-lg border border-border bg-card/40 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("automation.exec.col.trigger")}
                  </div>
                  <div className="mt-1 font-mono text-xs text-foreground">{run.triggerSource}</div>
                </div>

                {/* Error (if any) */}
                {run.errorMessage && (
                  <div className="rounded-lg border border-rose/30 bg-rose/5 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose">
                      <XCircle className="h-3.5 w-3.5" />
                      {t("automation.exec.error")}
                      {run.errorType && (
                        <Badge variant="outline" className="ml-1 border-rose/30 bg-rose/10 px-1 py-0 text-[9px] text-rose">
                          {run.errorType}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 font-mono text-xs text-rose/90">{run.errorMessage}</div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("automation.exec.timeline")}
                  </div>
                  {run.steps.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border bg-card/40 px-3 py-4 text-center text-xs text-muted-foreground">
                      {t("automation.exec.noSteps")}
                    </div>
                  ) : (
                    <div className="relative">
                      {/* vertical rail */}
                      <div className="absolute left-[14px] top-2 bottom-2 w-px bg-border" />
                      <ol className="flex flex-col gap-2">
                        {run.steps.map((step, i) => (
                          <TimelineStep
                            key={step.id}
                            step={step}
                            index={i}
                            isLast={i === run.steps.length - 1}
                          />
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <SheetFooter className="mt-3">
              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => toast.success(t("automation.exec.replayed"))}
              >
                <RotateCw className="h-3.5 w-3.5" />
                {t("automation.exec.replay")}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MetaRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("truncate text-xs text-foreground", mono && "font-mono text-[11px]")}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AutomationRun["status"] }) {
  const { t } = useLocale();
  const tone = statusColor(status);
  const cls = toneClasses(tone);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        cls.border,
        cls.bg,
        cls.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot)} />
      {t(`automation.run.${status}`)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline step (vertical stepper)
// ─────────────────────────────────────────────────────────────────────────────

const STEP_KIND_ICON: Record<StepKind, React.ReactNode> = {
  trigger: <Zap className="h-3 w-3" />,
  condition: <Filter className="h-3 w-3" />,
  action: <WorkflowIcon className="h-3 w-3" />,
};

function TimelineStep({
  step,
  index,
  isLast,
}: {
  step: ExecutionStep;
  index: number;
  isLast: boolean;
}) {
  const { t } = useLocale();
  const { icon, tone, ring } = stepVisual(step);
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.04, 0.3) }}
      className="relative pl-9"
    >
      {/* node */}
      <div
        className={cn(
          "absolute left-0 top-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-card",
          ring,
        )}
      >
        <span className={cn(tone)}>{icon}</span>
      </div>

      <div className={cn("rounded-lg border bg-card/40 p-2.5", ring)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="border-border bg-muted/40 px-1.5 py-0 text-[9px] uppercase tracking-wider text-muted-foreground"
            >
              {t(`automation.exec.step.${step.kind}`)}
            </Badge>
            <span className="text-xs font-medium text-foreground">{step.label}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {step.durationMs > 0 && <span className="font-mono">{step.durationMs}ms</span>}
            {step.retries > 0 && (
              <Badge variant="outline" className="border-amber/30 bg-amber/10 px-1 py-0 text-[9px] text-amber">
                <RotateCw className="mr-0.5 h-2.5 w-2.5" />
                {step.retries}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <StepStatusPill status={step.status} />
        </div>

        {/* Payload */}
        {(Object.keys(step.input).length > 0 || Object.keys(step.output).length > 0) && (
          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {Object.keys(step.input).length > 0 && (
              <PayloadBlock label={t("automation.exec.input")} payload={step.input} />
            )}
            {Object.keys(step.output).length > 0 && (
              <PayloadBlock label={t("automation.exec.output")} payload={step.output} />
            )}
          </div>
        )}

        {step.error && (
          <div className="mt-2 rounded-md border border-rose/30 bg-rose/5 px-2 py-1 font-mono text-[10px] text-rose">
            {step.error}
          </div>
        )}
      </div>
      {!isLast && <div className="h-2" />}
    </motion.li>
  );
}

function stepVisual(step: ExecutionStep): {
  icon: React.ReactNode;
  tone: string;
  ring: string;
} {
  const icon = STEP_KIND_ICON[step.kind];
  switch (step.status) {
    case "success":
      return {
        icon: icon ?? <CheckCircle2 className="h-3 w-3" />,
        tone: "text-success",
        ring: "border-success/40",
      };
    case "failed":
      return {
        icon: <XCircle className="h-3 w-3" />,
        tone: "text-rose",
        ring: "border-rose/40",
      };
    case "skipped":
      return {
        icon: <MinusCircle className="h-3 w-3" />,
        tone: "text-muted-foreground",
        ring: "border-border",
      };
    case "running":
      return {
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        tone: "text-cyan",
        ring: "border-cyan/40",
      };
    case "awaiting_approval":
      return {
        icon: <Lock className="h-3 w-3" />,
        tone: "text-amber",
        ring: "border-amber/40",
      };
    case "retried":
      return {
        icon: <RotateCw className="h-3 w-3" />,
        tone: "text-violet",
        ring: "border-violet/40",
      };
  }
}

function StepStatusPill({ status }: { status: StepStatus }) {
  const { t } = useLocale();
  const map: Record<StepStatus, { tone: string; label: string }> = {
    success: { tone: "text-success", label: t("automation.exec.stepSuccess") },
    failed: { tone: "text-rose", label: t("automation.exec.stepFailed") },
    skipped: { tone: "text-muted-foreground", label: t("automation.exec.stepSkipped") },
    running: { tone: "text-cyan", label: t("automation.exec.stepRunning") },
    awaiting_approval: { tone: "text-amber", label: t("automation.exec.stepAwaiting") },
    retried: { tone: "text-violet", label: t("automation.exec.stepRetried") },
  };
  const { tone, label } = map[status];
  return (
    <span className={cn("text-[10px] font-medium uppercase tracking-wider", tone)}>{label}</span>
  );
}

function PayloadBlock({
  label,
  payload,
}: {
  label: string;
  payload: Record<string, unknown>;
}) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-1.5">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <pre className="mt-0.5 max-h-24 overflow-auto text-[10px] text-muted-foreground">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}

export default ExecutionDetail;
