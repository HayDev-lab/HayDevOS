"use client";

/**
 * SettingsTab — Owner AI system configuration, capabilities, and reset.
 *
 * Surfaces:
 *  - Runtime: provider, model, online/offline status, prompt version, default mode.
 *  - Forbidden actions (rose): never executable.
 *  - Factuality rules (cyan): hard rules baked into the system prompt.
 *  - Available read tools (cyan): list with descriptions.
 *  - Available actions (lime safe / amber risky / rose forbidden).
 *  - "Reset audit store" button (POST /api/owner-ai/reset) with confirm.
 *
 * All data comes from the shared store's `config` (populated by GET /state).
 */

import { useState } from "react";
import {
  Cpu,
  Shield,
  ShieldX,
  Sparkles,
  Wrench,
  Zap,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n";
import { useOwnerAiStore } from "../state";
import type { ActionSafety } from "@/app/api/owner-ai/types";

export function SettingsTab() {
  const { t } = useLocale();
  const config = useOwnerAiStore((s) => s.config);
  const resetAudit = useOwnerAiStore((s) => s.resetAudit);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleReset() {
    setBusy(true);
    try {
      await resetAudit();
      toast.success(t("ownerAi.settings.resetDone"));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!config) {
    return (
      <div className="surface-elevated flex items-center justify-center rounded-xl border border-border/60 p-10 text-xs text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  const online = config.provider === "openai-compatible";

  return (
    <div className="space-y-4">
      {/* Runtime */}
      <section className="surface-elevated rounded-xl border border-border/60 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime/10 text-lime">
            <Cpu className="h-3.5 w-3.5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t("ownerAi.settings.runtime")}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {t("ownerAi.settings.subtitle")}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("ownerAi.settings.provider")} value={config.provider} mono />
          <Field
            label={t("ownerAi.settings.model")}
            value={config.model ?? "—"}
            mono
          />
          <Field label={t("ownerAi.settings.promptVersion")} value={config.promptVersion} mono />
          <Field label={t("ownerAi.settings.defaultMode")} value={config.defaultMode} mono />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t("ownerAi.settings.status")}
            </div>
            <span
              className={cn(
                "mt-1 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold",
                online
                  ? "border-lime/30 bg-lime/10 text-lime"
                  : "border-amber/30 bg-amber/10 text-amber",
              )}
            >
              {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {online ? t("ownerAi.settings.online") : t("ownerAi.settings.offline")}
            </span>
          </div>
        </div>
      </section>

      {/* Forbidden actions */}
      <section className="surface-elevated rounded-xl border border-rose/30 bg-rose/[0.02] p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose/10 text-rose">
            <ShieldX className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              {t("ownerAi.settings.forbiddenActions")}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {t("ownerAi.settings.forbiddenActionsHint")}
            </p>
          </div>
          <span className="rounded bg-rose/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose">
            {config.forbiddenActions.length}
          </span>
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {config.forbiddenActions.map((name) => (
            <li
              key={name}
              className="flex items-center gap-1.5 rounded border border-rose/20 bg-background/40 px-2 py-1.5 text-[11px]"
            >
              <ShieldX className="h-3 w-3 shrink-0 text-rose" />
              <span className="font-mono text-rose/90">{name}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Factuality rules */}
      <section className="surface-elevated rounded-xl border border-cyan/30 bg-cyan/[0.02] p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
            <Shield className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              {t("ownerAi.settings.factualityRules")}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {t("ownerAi.settings.factualityRulesHint")}
            </p>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5">
          {config.factualityRules.map((rule, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded border border-cyan/20 bg-background/40 px-2.5 py-1.5 text-[11px] text-foreground/80"
            >
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-cyan" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Available tools + actions */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
              <Wrench className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-sm font-semibold text-foreground">
              {t("ownerAi.settings.availableTools")}
            </h3>
            <span className="ml-auto rounded bg-cyan/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan">
              {config.availableTools.length}
            </span>
          </div>
          <ul className="mt-3 max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {config.availableTools.map((tool) => (
              <li
                key={tool.name}
                className="rounded border border-border/40 bg-background/40 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <Wrench className="h-3 w-3 shrink-0 text-cyan" />
                  <span className="font-mono text-[11px] font-semibold text-cyan">{tool.name}</span>
                  <span className="ml-auto rounded bg-cyan/10 px-1 text-[9px] uppercase tracking-wider text-cyan">
                    {t("ownerAi.settings.toolSafe")}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{tool.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime/10 text-lime">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-sm font-semibold text-foreground">
              {t("ownerAi.settings.availableActions")}
            </h3>
            <span className="ml-auto rounded bg-lime/15 px-1.5 py-0.5 text-[10px] font-semibold text-lime">
              {config.availableActions.length}
            </span>
          </div>
          <ul className="mt-3 max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {config.availableActions.map((act) => (
              <ActionRow key={act.name} name={act.name} description={act.description} safety={act.safety} />
            ))}
          </ul>
        </section>
      </div>

      {/* Reset */}
      <section className="surface-elevated rounded-xl border border-rose/30 bg-rose/[0.02] p-4">
        <div className="flex items-start gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose/10 text-rose">
            <AlertTriangle className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              {t("ownerAi.settings.reset")}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {t("ownerAi.settings.resetHint")}
            </p>
            <div className="mt-3 flex items-center gap-2">
              {!confirming ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirming(true)}
                  className="h-8 gap-1.5 border-rose/40 bg-rose/5 text-[11px] font-semibold text-rose hover:bg-rose/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("ownerAi.settings.reset")}
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-rose">
                    {t("ownerAi.settings.resetConfirm")}
                  </span>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleReset}
                          disabled={busy}
                          className="h-8 gap-1.5 border-rose/40 bg-rose/90 text-[11px] font-semibold text-background hover:bg-rose"
                        >
                          <RotateCcw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
                          {t("ownerAi.settings.resetConfirmBtn")}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[11px]">
                        {t("ownerAi.settings.reset")}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming(false)}
                    disabled={busy}
                    className="h-8 px-2.5 text-[11px] text-muted-foreground"
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-[11px] text-foreground/80",
          mono && "font-mono break-all",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ActionRow({
  name,
  description,
  safety,
}: {
  name: string;
  description: string;
  safety: ActionSafety;
}) {
  const { t } = useLocale();
  const tone =
    safety === "safe" ? "lime" : safety === "risky" ? "amber" : "rose";
  const Icon = safety === "safe" ? Zap : safety === "risky" ? Shield : ShieldX;
  const label =
    safety === "safe"
      ? t("ownerAi.settings.toolSafeAction")
      : safety === "risky"
        ? t("ownerAi.settings.toolRisky")
        : t("ownerAi.settings.toolForbidden");
  return (
    <li className="rounded border border-border/40 bg-background/40 px-2.5 py-1.5">
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            "h-3 w-3 shrink-0",
            tone === "lime" && "text-lime",
            tone === "amber" && "text-amber",
            tone === "rose" && "text-rose",
          )}
        />
        <span className="font-mono text-[11px] font-semibold text-foreground">{name}</span>
        <span
          className={cn(
            "ml-auto rounded px-1 text-[9px] uppercase tracking-wider",
            tone === "lime" && "bg-lime/10 text-lime",
            tone === "amber" && "bg-amber/10 text-amber",
            tone === "rose" && "bg-rose/10 text-rose",
          )}
        >
          {label}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
    </li>
  );
}
