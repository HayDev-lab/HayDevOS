"use client";

/**
 * VisualBuilder — the workflow centerpiece.
 *
 * Three vertical columns connected by arrow rails:
 *
 *     WHEN (trigger) → IF (conditions) → THEN (actions)
 *
 * Top bar: name input, status toggle, Save Draft / Activate / Dry Run / Test.
 * "Loop Protection" badge with max depth + dedup key.
 * Risky actions (external message, financial mutation, webhook, AI) get an
 * approval-required toggle that is ON by default.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  Filter,
  Workflow as WorkflowIcon,
  Save,
  Rocket,
  FlaskConical,
  Play,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ShieldAlert,
  GripVertical,
  ArrowDown,
  Lock,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  TRIGGER_TYPES,
  CONDITION_OPS,
  ACTION_TYPES,
  isRiskyAction,
  type Automation,
  type Trigger,
  type Condition,
  type Action,
  type TriggerType,
  type ActionType,
  type ConditionOp,
} from "../types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  automation: Automation;
  onPatch: (patch: Partial<Automation>) => void;
}

interface ConfigRow {
  id: string;
  key: string;
  value: string;
}

function rowsFromConfig(cfg: Record<string, unknown>): ConfigRow[] {
  const entries = Object.entries(cfg ?? {});
  if (entries.length === 0) return [];
  return entries.map(([k, v], i) => ({
    id: `r_${i}_${k}`,
    key: k,
    value: typeof v === "string" ? v : JSON.stringify(v),
  }));
}

function configFromRows(rows: ConfigRow[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    if (!r.key) continue;
    // Try to parse JSON-y values (numbers/booleans/arrays), fall back to string.
    const v = r.value.trim();
    if (v === "") {
      out[r.key] = "";
      continue;
    }
    if (/^-?\d+(\.\d+)?$/.test(v)) {
      out[r.key] = Number(v);
    } else if (v === "true" || v === "false") {
      out[r.key] = v === "true";
    } else if (v.startsWith("[") || v.startsWith("{")) {
      try {
        out[r.key] = JSON.parse(v);
      } catch {
        out[r.key] = v;
      }
    } else {
      out[r.key] = v;
    }
  }
  return out;
}

export function VisualBuilder({ automation, onPatch }: Props) {
  const { t } = useLocale();
  const [name, setName] = useState(automation.name);
  const [description, setDescription] = useState(automation.description ?? "");
  const [trigger, setTrigger] = useState<Trigger>(automation.trigger);
  const [conditions, setConditions] = useState<Condition[]>(automation.conditions);
  const [actions, setActions] = useState<Action[]>(automation.actions);
  const [maxDepth, setMaxDepth] = useState(automation.maxDepth);
  const [dedupKey, setDedupKey] = useState(automation.dedupKey);
  const [reentryPolicy, setReentryPolicy] = useState(automation.reentryPolicy);
  const [dryRunOpen, setDryRunOpen] = useState(false);

  // NOTE: parent passes key={automation.id} so this component fully remounts
  // when switching automations — local useState seeds from props once and
  // then is the source of truth until saved.

  function commit(patch: Partial<Automation>) {
    onPatch(patch);
  }

  function addCondition() {
    const c: Condition = {
      id: `c_${Date.now()}`,
      field: "lead.value",
      op: "gt",
      value: 0,
    };
    setConditions((prev) => [...prev, c]);
  }
  function removeCondition(id: string) {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  }
  function patchCondition(id: string, patch: Partial<Condition>) {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function addAction() {
    const a: Action = {
      id: `a_${Date.now()}`,
      type: "send_notification",
      config: { channel: "in_app" },
      requiresApproval: isRiskyAction("send_notification"),
    };
    setActions((prev) => [...prev, a]);
  }
  function removeAction(id: string) {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }
  function patchAction(id: string, patch: Partial<Action>) {
    setActions((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const next = { ...a, ...patch };
        // Risky → ensure approval defaults ON.
        if (patch.type && isRiskyAction(patch.type) && next.requiresApproval === undefined) {
          next.requiresApproval = true;
        }
        return next;
      }),
    );
  }
  function moveAction(index: number, dir: -1 | 1) {
    setActions((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function saveDraft() {
    commit({
      name,
      description,
      trigger,
      conditions,
      actions,
      maxDepth,
      dedupKey,
      reentryPolicy,
      status: "draft",
    });
    toast.success(t("automation.builder.saved"));
  }
  function activate() {
    commit({
      name,
      description,
      trigger,
      conditions,
      actions,
      maxDepth,
      dedupKey,
      reentryPolicy,
      status: "active",
    });
    toast.success(t("automation.builder.activated"));
  }
  function dryRun() {
    commit({ name, description, trigger, conditions, actions, maxDepth, dedupKey, reentryPolicy });
    setDryRunOpen(true);
  }
  function test() {
    commit({ name, description, trigger, conditions, actions, maxDepth, dedupKey, reentryPolicy });
    toast.success(t("automation.builder.tested"));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="glass-strong rounded-xl border border-border p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 max-w-md bg-card/60 text-base font-semibold"
              placeholder={t("automation.builder.name")}
            />
            <Badge
              variant="outline"
              className={cn(
                "w-fit gap-1.5 border-amber/30 bg-amber/10 text-amber",
                automation.status === "active" && "border-lime/30 bg-lime/10 text-lime",
                automation.status === "paused" && "border-amber/30 bg-amber/10 text-amber",
                automation.status === "draft" && "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  automation.status === "active" && "bg-lime",
                  automation.status === "paused" && "bg-amber",
                  automation.status === "draft" && "bg-muted-foreground",
                )}
              />
              {t(`automation.status.${automation.status}`)} · v{automation.version}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={saveDraft} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {t("automation.builder.saveDraft")}
            </Button>
            <Button variant="outline" size="sm" onClick={dryRun} className="gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-cyan" />
              {t("automation.builder.dryRun")}
            </Button>
            <Button variant="outline" size="sm" onClick={test} className="gap-1.5">
              <Play className="h-3.5 w-3.5" />
              {t("automation.builder.test")}
            </Button>
            <Button
              size="sm"
              onClick={activate}
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Rocket className="h-3.5 w-3.5" />
              {t("automation.builder.activate")}
            </Button>
          </div>
        </div>

        {/* Description + Loop protection badge */}
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("automation.builder.description")}
            className="min-h-[36px] flex-1 resize-none bg-card/60 text-sm"
            rows={1}
          />
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-cyan/30 bg-cyan/10 px-2.5 py-1.5 text-xs text-cyan">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="font-semibold">{t("automation.builder.loopProtection")}</span>
              <span className="text-cyan/80">·</span>
              <span>
                {t("automation.builder.maxDepth")}: <strong className="text-foreground">{maxDepth}</strong>
              </span>
            </div>
            <Input
              value={dedupKey}
              onChange={(e) => setDedupKey(e.target.value)}
              className="h-8 w-44 bg-card/60 font-mono text-xs"
              aria-label={t("automation.builder.dedupKey")}
            />
          </div>
        </div>
      </div>

      {/* 3-column WHEN → IF → THEN flow */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* WHEN */}
        <FlowColumn
          tone="lime"
          icon={<Zap className="h-4 w-4" />}
          title={t("automation.builder.when")}
          subtitle={t("automation.builder.when.sub")}
        >
          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("automation.builder.triggerType")}
              </Label>
              <Select
                value={trigger.type}
                onValueChange={(v) => setTrigger((prev) => ({ ...prev, type: v as TriggerType }))}
              >
                <SelectTrigger className="mt-1 bg-card/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((tt) => (
                    <SelectItem key={tt} value={tt}>
                      <span className="font-mono text-xs">{tt}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ConfigEditor
              label={t("automation.builder.triggerConfig")}
              rows={rowsFromConfig(trigger.config)}
              onChange={(rows) => setTrigger((prev) => ({ ...prev, config: configFromRows(rows) }))}
              newKeyHint="source"
            />
            {/* Trigger-type-specific helper hint */}
            {trigger.type === "schedule" && (
              <div className="rounded-md border border-amber/30 bg-amber/5 px-2.5 py-1.5 text-[11px] text-amber">
                Cron example: <code className="font-mono">0 9 * * 1</code> = every Monday 09:00.
              </div>
            )}
            {trigger.type === "webhook" && (
              <div className="rounded-md border border-cyan/30 bg-cyan/5 px-2.5 py-1.5 text-[11px] text-cyan">
                Webhook triggers fire when an inbound payload matches the configured event type.
              </div>
            )}
          </div>
        </FlowColumn>

        {/* IF */}
        <FlowColumn
          tone="cyan"
          icon={<Filter className="h-4 w-4" />}
          title={t("automation.builder.if")}
          subtitle={t("automation.builder.if.sub")}
        >
          <div className="flex flex-col gap-2.5">
            {conditions.length === 0 && (
              <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-center text-xs text-muted-foreground">
                {t("automation.builder.emptyConditions")}
              </div>
            )}
            {conditions.map((c, i) => (
              <ConditionRow
                key={c.id}
                index={i}
                condition={c}
                onPatch={(p) => patchCondition(c.id, p)}
                onRemove={() => removeCondition(c.id)}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addCondition}
              className="mt-1 gap-1.5 self-start border-dashed text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("automation.builder.addCondition")}
            </Button>
          </div>
        </FlowColumn>

        {/* THEN */}
        <FlowColumn
          tone="violet"
          icon={<WorkflowIcon className="h-4 w-4" />}
          title={t("automation.builder.then")}
          subtitle={t("automation.builder.then.sub")}
        >
          <div className="flex flex-col gap-2.5">
            {actions.length === 0 && (
              <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-center text-xs text-muted-foreground">
                {t("automation.builder.emptyActions")}
              </div>
            )}
            {actions.map((a, i) => (
              <ActionBlock
                key={a.id}
                index={i}
                total={actions.length}
                action={a}
                onPatch={(p) => patchAction(a.id, p)}
                onRemove={() => removeAction(a.id)}
                onMove={(dir) => moveAction(i, dir)}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addAction}
              className="mt-1 gap-1.5 self-start border-dashed text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("automation.builder.addAction")}
            </Button>
          </div>
        </FlowColumn>
      </div>

      {/* Reentry policy row */}
      <div className="glass rounded-xl border border-border p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("automation.builder.maxDepth")}
            </Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={maxDepth}
              onChange={(e) => setMaxDepth(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              className="h-8 w-20 bg-card/60 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("automation.builder.reentryPolicy")}
            </Label>
            <Select value={reentryPolicy} onValueChange={(v) => setReentryPolicy(v as typeof reentryPolicy)}>
              <SelectTrigger className="h-8 w-32 bg-card/60 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allow">{t("automation.builder.reentry.allow")}</SelectItem>
                <SelectItem value="block">{t("automation.builder.reentry.block")}</SelectItem>
                <SelectItem value="queue">{t("automation.builder.reentry.queue")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {conditions.length} {t("automation.conditionCount", { count: conditions.length }).split(" ")[1]} ·{" "}
            {actions.length} {t("automation.actionCount", { count: actions.length }).split(" ")[1]}
          </div>
        </div>
      </div>

      {/* Dry run panel */}
      <DryRunSheet
        open={dryRunOpen}
        onOpenChange={setDryRunOpen}
        trigger={trigger}
        conditions={conditions}
        actions={actions}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow column wrapper
// ─────────────────────────────────────────────────────────────────────────────

function FlowColumn({
  tone,
  icon,
  title,
  subtitle,
  children,
}: {
  tone: "lime" | "cyan" | "violet";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const toneCls = {
    lime: "border-lime/30 text-lime",
    cyan: "border-cyan/30 text-cyan",
    violet: "border-violet/30 text-violet",
  }[tone];
  const headerBg = {
    lime: "bg-lime/5",
    cyan: "bg-cyan/5",
    violet: "bg-violet/5",
  }[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("relative flex flex-col rounded-xl border bg-card/40", toneCls)}
    >
      <div className={cn("flex items-center gap-2.5 rounded-t-xl border-b px-4 py-2.5", headerBg, toneCls)}>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-card/80">{icon}</span>
        <div>
          <div className="text-sm font-bold tracking-wider">{title}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      <div className="flex-1 p-3 sm:p-4">{children}</div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Condition row
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_SUGGESTIONS = [
  "lead.value",
  "lead.region",
  "lead.source",
  "lead.stage",
  "lead.slaBreached",
  "lead.lastActivityDaysAgo",
  "quote.total",
  "quote.discountPct",
  "doc.classification",
];

function ConditionRow({
  index,
  condition,
  onPatch,
  onRemove,
}: {
  index: number;
  condition: Condition;
  onPatch: (patch: Partial<Condition>) => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="rounded-lg border border-border bg-card/60 p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          #{index + 1}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-rose"
          onClick={onRemove}
          aria-label={t("automation.builder.removeCondition")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <Input
          list="field-suggestions"
          value={condition.field}
          onChange={(e) => onPatch({ field: e.target.value })}
          className="h-8 bg-background/60 font-mono text-xs"
          placeholder={t("automation.builder.field")}
        />
        <datalist id="field-suggestions">
          {FIELD_SUGGESTIONS.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <Select value={condition.op} onValueChange={(v) => onPatch({ op: v as ConditionOp })}>
          <SelectTrigger className="h-8 bg-background/60 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONDITION_OPS.map((op) => (
              <SelectItem key={op} value={op} className="font-mono text-xs">
                {op}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={typeof condition.value === "string" ? condition.value : JSON.stringify(condition.value)}
          onChange={(e) => {
            const raw = e.target.value;
            // Try to parse JSON, else fall back to string.
            try {
              onPatch({ value: JSON.parse(raw) });
            } catch {
              onPatch({ value: raw });
            }
          }}
          className="h-8 bg-background/60 font-mono text-xs"
          placeholder={t("automation.builder.value")}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Action block (with reorder handles + approval toggle)
// ─────────────────────────────────────────────────────────────────────────────

function ActionBlock({
  index,
  total,
  action,
  onPatch,
  onRemove,
  onMove,
}: {
  index: number;
  total: number;
  action: Action;
  onPatch: (patch: Partial<Action>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const { t } = useLocale();
  const risky = isRiskyAction(action.type);
  const requiresApproval = action.requiresApproval ?? false;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border bg-card/60 p-2.5",
        risky ? "border-rose/30" : "border-border",
      )}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          #{index + 1}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label={t("automation.builder.moveUp")}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label={t("automation.builder.moveDown")}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-rose"
            onClick={onRemove}
            aria-label={t("automation.builder.removeAction")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Select value={action.type} onValueChange={(v) => onPatch({ type: v as ActionType })}>
        <SelectTrigger className="h-8 bg-background/60 font-mono text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTION_TYPES.map((at) => (
            <SelectItem key={at} value={at} className="font-mono text-xs">
              {isRiskyAction(at) ? "⚠ " : ""}{at}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="mt-2">
        <ConfigEditor
          label={t("automation.builder.actionConfig")}
          rows={rowsFromConfig(action.config)}
          onChange={(rows) => onPatch({ config: configFromRows(rows) })}
          newKeyHint="channel"
          compact
        />
      </div>

      {/* Approval row */}
      <div
        className={cn(
          "mt-2 flex items-center justify-between rounded-md border px-2.5 py-1.5",
          requiresApproval
            ? "border-amber/30 bg-amber/5"
            : "border-border bg-background/40",
        )}
      >
        <div className="flex items-center gap-1.5 text-xs">
          {requiresApproval ? (
            <Lock className="h-3.5 w-3.5 text-amber" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className={requiresApproval ? "text-amber" : "text-muted-foreground"}>
            {t("automation.builder.requiresApproval")}
          </span>
          {risky && (
            <Badge variant="outline" className="ml-1 border-rose/30 bg-rose/10 px-1 py-0 text-[9px] uppercase tracking-wider text-rose">
              {t("automation.builder.riskyBadge")}
            </Badge>
          )}
        </div>
        <Switch
          checked={requiresApproval}
          onCheckedChange={(v) => onPatch({ requiresApproval: v })}
          aria-label={t("automation.builder.requiresApproval")}
        />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfigEditor — key/value pairs for trigger & action configs
// ─────────────────────────────────────────────────────────────────────────────

function ConfigEditor({
  label,
  rows,
  onChange,
  newKeyHint,
  compact,
}: {
  label: string;
  rows: ConfigRow[];
  onChange: (rows: ConfigRow[]) => void;
  newKeyHint?: string;
  compact?: boolean;
}) {
  const { t } = useLocale();

  function addRow() {
    onChange([...rows, { id: `r_${Date.now()}`, key: newKeyHint ?? "", value: "" }]);
  }
  function patchRow(id: string, patch: Partial<ConfigRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className={cn("mt-1 flex flex-col gap-1.5", compact && "gap-1")}>
        {rows.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-background/40 px-2 py-1.5 text-[10px] text-muted-foreground">
            {t("common.empty")}
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-1">
            <Input
              value={r.key}
              onChange={(e) => patchRow(r.id, { key: e.target.value })}
              className="h-7 flex-1 bg-background/60 font-mono text-[11px]"
              placeholder={t("automation.builder.configKey")}
            />
            <Input
              value={r.value}
              onChange={(e) => patchRow(r.id, { value: e.target.value })}
              className="h-7 flex-[1.4] bg-background/60 font-mono text-[11px]"
              placeholder={t("automation.builder.configValue")}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose"
              onClick={() => removeRow(r.id)}
              aria-label={t("automation.builder.removeAction")}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={addRow}
          className="h-7 w-fit gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          {t("automation.builder.addRow")}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dry run side sheet
// ─────────────────────────────────────────────────────────────────────────────

function DryRunSheet({
  open,
  onOpenChange,
  trigger,
  conditions,
  actions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trigger: Trigger;
  conditions: Condition[];
  actions: Action[];
}) {
  const { t } = useLocale();

  const plan = useMemo(() => {
    return {
      triggerStep: { label: `${trigger.type}`, config: trigger.config },
      conditionSteps: conditions.map((c) => ({
        label: `${c.field} ${c.op} ${typeof c.value === "string" ? c.value : JSON.stringify(c.value)}`,
      })),
      actionSteps: actions.map((a) => ({
        label: `${a.type}`,
        requiresApproval: a.requiresApproval ?? false,
        config: a.config,
      })),
    };
  }, [trigger, conditions, actions]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-cyan" />
            <SheetTitle className="text-base">{t("automation.builder.dryRunTitle")}</SheetTitle>
          </div>
          <SheetDescription>{t("automation.builder.dryRunSub")}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-4 max-h-[calc(100vh-220px)]">
          <div className="flex flex-col gap-3 pr-2">
            {/* Trigger */}
            <PlanStep
              tone="lime"
              step={t("automation.builder.dryRunTrigger")}
              label={plan.triggerStep.label}
              payload={plan.triggerStep.config}
            />
            <div className="flex justify-center text-muted-foreground/50">
              <ArrowDown className="h-3.5 w-3.5" />
            </div>
            {/* Conditions */}
            <PlanStep
              tone="cyan"
              step={t("automation.builder.dryRunConditions")}
              label={`${plan.conditionSteps.length} ${t("automation.builder.if.sub").toLowerCase()}`}
              payload={plan.conditionSteps.map((c) => c.label)}
            />
            <div className="flex justify-center text-muted-foreground/50">
              <ArrowDown className="h-3.5 w-3.5" />
            </div>
            {/* Actions */}
            <PlanStep
              tone="violet"
              step={t("automation.builder.dryRunActions")}
              label={`${plan.actionSteps.length} ${t("automation.builder.then.sub").toLowerCase()}`}
              payload={plan.actionSteps}
            />

            <div className="mt-2 flex items-start gap-2 rounded-md border border-cyan/30 bg-cyan/5 px-2.5 py-2 text-[11px] text-cyan">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t("automation.builder.dryRunConfirm")}</span>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              toast.success(t("automation.builder.dryRunDone"));
            }}
            className="w-full"
          >
            {t("automation.builder.dryRunClose")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function PlanStep({
  tone,
  step,
  label,
  payload,
}: {
  tone: "lime" | "cyan" | "violet";
  step: string;
  label: string;
  payload: unknown;
}) {
  const toneCls = {
    lime: "border-lime/30 bg-lime/5 text-lime",
    cyan: "border-cyan/30 bg-cyan/5 text-cyan",
    violet: "border-violet/30 bg-violet/5 text-violet",
  }[tone];
  return (
    <div className={cn("rounded-lg border p-2.5", toneCls)}>
      <div className="text-[10px] font-semibold uppercase tracking-wider">{step}</div>
      <div className="mt-0.5 font-mono text-xs text-foreground">{label}</div>
      <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-background/60 p-2 text-[10px] text-muted-foreground">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}

export default VisualBuilder;
