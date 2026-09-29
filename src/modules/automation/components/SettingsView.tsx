"use client";

/**
 * SettingsView — engine settings:
 *  - Loop protection (max depth, reentry policy, dedup TTL)
 *  - Retry policy (max retries, backoff strategy, initial/max delay)
 *  - Concurrency (max concurrent runs, per-automation limit, queue timeout)
 */

import { useState } from "react";
import { Save, ShieldAlert, RotateCw, Layers } from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import type { EngineSettings } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  initial: EngineSettings;
}

export function SettingsView({ initial }: Props) {
  const { t } = useLocale();
  const [settings, setSettings] = useState<EngineSettings>(initial);

  function patchLoop(patch: Partial<EngineSettings["loopProtection"]>) {
    setSettings((s) => ({ ...s, loopProtection: { ...s.loopProtection, ...patch } }));
  }
  function patchRetry(patch: Partial<EngineSettings["retryPolicy"]>) {
    setSettings((s) => ({ ...s, retryPolicy: { ...s.retryPolicy, ...patch } }));
  }
  function patchConcurrency(patch: Partial<EngineSettings["concurrency"]>) {
    setSettings((s) => ({ ...s, concurrency: { ...s.concurrency, ...patch } }));
  }
  function save() {
    toast.success(t("automation.settings.saved"));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("automation.settings.title")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground/80">{t("automation.settings.sub")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Loop protection */}
        <Card className="surface-elevated py-0">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan/10 text-cyan">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">
                {t("automation.settings.loop")}
              </h3>
            </div>
            <Field label={t("automation.settings.loop.maxDepth")}>
              <Input
                type="number"
                min={1}
                max={20}
                value={settings.loopProtection.maxDepth}
                onChange={(e) =>
                  patchLoop({ maxDepth: Math.max(1, Number(e.target.value) || 1) })
                }
                className="bg-card/60"
              />
            </Field>
            <Field label={t("automation.settings.loop.reentry")}>
              <Select
                value={settings.loopProtection.reentryPolicy}
                onValueChange={(v) =>
                  patchLoop({ reentryPolicy: v as EngineSettings["loopProtection"]["reentryPolicy"] })
                }
              >
                <SelectTrigger className="bg-card/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">{t("automation.builder.reentry.allow")}</SelectItem>
                  <SelectItem value="block">{t("automation.builder.reentry.block")}</SelectItem>
                  <SelectItem value="queue">{t("automation.builder.reentry.queue")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("automation.settings.loop.dedupTtl")}>
              <Input
                type="number"
                min={0}
                value={settings.loopProtection.dedupTtlSec}
                onChange={(e) => patchLoop({ dedupTtlSec: Math.max(0, Number(e.target.value) || 0) })}
                className="bg-card/60"
              />
            </Field>
          </CardContent>
        </Card>

        {/* Retry policy */}
        <Card className="surface-elevated py-0">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber/10 text-amber">
                <RotateCw className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">
                {t("automation.settings.retry")}
              </h3>
            </div>
            <Field label={t("automation.settings.retry.max")}>
              <Input
                type="number"
                min={0}
                max={10}
                value={settings.retryPolicy.maxRetries}
                onChange={(e) =>
                  patchRetry({ maxRetries: Math.max(0, Number(e.target.value) || 0) })
                }
                className="bg-card/60"
              />
            </Field>
            <Field label={t("automation.settings.retry.backoff")}>
              <Select
                value={settings.retryPolicy.backoffStrategy}
                onValueChange={(v) =>
                  patchRetry({ backoffStrategy: v as EngineSettings["retryPolicy"]["backoffStrategy"] })
                }
              >
                <SelectTrigger className="bg-card/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{t("automation.settings.backoff.fixed")}</SelectItem>
                  <SelectItem value="linear">{t("automation.settings.backoff.linear")}</SelectItem>
                  <SelectItem value="exponential">{t("automation.settings.backoff.exponential")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("automation.settings.retry.initial")}>
              <Input
                type="number"
                min={0}
                value={settings.retryPolicy.initialDelayMs}
                onChange={(e) =>
                  patchRetry({ initialDelayMs: Math.max(0, Number(e.target.value) || 0) })
                }
                className="bg-card/60"
              />
            </Field>
            <Field label={t("automation.settings.retry.maxDelay")}>
              <Input
                type="number"
                min={0}
                value={settings.retryPolicy.maxDelayMs}
                onChange={(e) =>
                  patchRetry({ maxDelayMs: Math.max(0, Number(e.target.value) || 0) })
                }
                className="bg-card/60"
              />
            </Field>
          </CardContent>
        </Card>

        {/* Concurrency */}
        <Card className="surface-elevated py-0">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-violet/10 text-violet">
                <Layers className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">
                {t("automation.settings.concurrency")}
              </h3>
            </div>
            <Field label={t("automation.settings.concurrency.max")}>
              <Input
                type="number"
                min={1}
                value={settings.concurrency.maxConcurrentRuns}
                onChange={(e) =>
                  patchConcurrency({
                    maxConcurrentRuns: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                className="bg-card/60"
              />
            </Field>
            <Field label={t("automation.settings.concurrency.perAuto")}>
              <Input
                type="number"
                min={1}
                value={settings.concurrency.perAutomationLimit}
                onChange={(e) =>
                  patchConcurrency({
                    perAutomationLimit: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                className="bg-card/60"
              />
            </Field>
            <Field label={t("automation.settings.concurrency.queueTimeout")}>
              <Input
                type="number"
                min={0}
                value={settings.concurrency.queueTimeoutMs}
                onChange={(e) =>
                  patchConcurrency({
                    queueTimeoutMs: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="bg-card/60"
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Save className="h-4 w-4" />
          {t("automation.settings.save")}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export default SettingsView;
