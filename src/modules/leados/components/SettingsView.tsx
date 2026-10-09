"use client";

import { localizeError } from "@/lib/i18n-errors";

import { useState } from "react";
import { Clock, Columns3, Save, Workflow } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LeadSlaPolicyDto } from "@/lib/leads/types";
import { useLocale } from "@/lib/i18n";
import { useLeadOSData } from "../LeadOSData";

export function SettingsView() {
  const { t } = useLocale();
  const { overview, updateSla } = useLeadOSData();
  const [sla, setSla] = useState<LeadSlaPolicyDto>(overview!.slaPolicy);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateSla(sla);
      toast.success(t("leados.runtime.slaSaved"));
    } catch (cause) {
      toast.error(cause instanceof Error ? localizeError(cause) : t("leados.runtime.slaSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="stages" className="gap-4">
        <TabsList className="bg-card/60 p-1">
          <TabsTrigger value="stages" className="gap-1.5"><Workflow className="h-3.5 w-3.5" />{t("leados.settings.stages")}</TabsTrigger>
          <TabsTrigger value="sla" className="gap-1.5"><Clock className="h-3.5 w-3.5" />{t("leados.settings.slaPolicies")}</TabsTrigger>
          <TabsTrigger value="pipelines" className="gap-1.5"><Columns3 className="h-3.5 w-3.5" />{t("leados.settings.pipelines")}</TabsTrigger>
        </TabsList>

        <TabsContent value="stages">
          <Card className="surface-elevated">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3"><Workflow className="h-4 w-4 text-lime" /><h3 className="text-sm font-semibold">{t("leados.runtime.pipelineStages")}</h3></div>
            <CardContent className="space-y-3 p-5">
              {overview!.pipelines.map((pipeline) => (
                <section key={pipeline.id} className="rounded-lg border border-border p-3">
                  <h4 className="mb-2 text-sm font-medium">{pipeline.name}{pipeline.isDefault ? ` · ${t("leados.runtime.default")}` : ""}</h4>
                  <ol className="space-y-1">
                    {pipeline.stages.map((stage) => (
                      <li key={stage.id} className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm">
                        <span className="size-2 rounded-full" style={{ backgroundColor: stage.color ?? "var(--muted-foreground)" }} />
                        <span className="flex-1">{stage.name}</span>
                        <span className="text-[10px] uppercase text-muted-foreground">{stage.isWon ? t("leados.runtime.won") : stage.isClosed ? t("leados.runtime.closed") : t("leados.tasks.open")}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla">
          <Card className="surface-elevated">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3"><Clock className="h-4 w-4 text-cyan" /><h3 className="text-sm font-semibold">{t("leados.runtime.slaPolicy")}</h3></div>
            <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <MinutesInput label={t("leados.detail.firstResponse")} minutes={t("leados.runtime.minutes")} value={sla.firstResponseMinutes} onChange={(value) => setSla((current) => ({ ...current, firstResponseMinutes: value }))} />
              <MinutesInput label={t("leados.runtime.warningThreshold")} minutes={t("leados.runtime.minutes")} value={sla.warningMinutes} min={0} onChange={(value) => setSla((current) => ({ ...current, warningMinutes: value }))} />
              <MinutesInput label={t("leados.runtime.followUpInterval")} minutes={t("leados.runtime.minutes")} value={sla.followUpMinutes} onChange={(value) => setSla((current) => ({ ...current, followUpMinutes: value }))} />
              <MinutesInput label={t("leados.tasks.stageInactivity")} minutes={t("leados.runtime.minutes")} value={sla.stageInactivityMinutes} onChange={(value) => setSla((current) => ({ ...current, stageInactivityMinutes: value }))} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipelines">
          <Card className="surface-elevated">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3"><Columns3 className="h-4 w-4 text-amber" /><h3 className="text-sm font-semibold">{t("leados.settings.pipelines")}</h3></div>
            <CardContent className="space-y-2 p-5">
              {overview!.pipelines.map((pipeline) => (
                <div key={pipeline.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-sm font-medium">{pipeline.name}</span>
                  <span className="text-xs text-muted-foreground">{t("leados.runtime.stageCount", { count: pipeline.stages.length })}{pipeline.isDefault ? ` · ${t("leados.runtime.default")}` : ""}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving}><Save className="h-3.5 w-3.5" />{saving ? t("leados.runtime.saving") : t("leados.runtime.saveSla")}</Button>
      </div>
    </div>
  );
}

function MinutesInput({ label, minutes, value, onChange, min = 1 }: { label: string; minutes: string; value: number; min?: number; onChange: (value: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label} ({minutes})</Label>
      <Input type="number" min={min} value={value} onChange={(event) => onChange(Math.max(min, Number.parseInt(event.target.value, 10) || min))} />
    </div>
  );
}
