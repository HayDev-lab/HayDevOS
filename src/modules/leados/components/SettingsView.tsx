"use client";

/**
 * LeadOS — Settings tab.
 *
 * 4 sub-sections via Tabs:
 *  - Stages — list of pipeline stages with color dots + Add stage
 *  - SLA policies — first response, follow-up, stage inactivity inputs
 *  - Custom fields — list of fields + Add field
 *  - Pipelines — list of pipelines + Add pipeline
 *
 * Save → toast.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Workflow,
  Clock,
  ListPlus,
  Columns3,
  Plus,
  Save,
  Trash2,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, toneClasses } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import {
  LEAD_STAGES,
  SLA_POLICIES,
} from "../data";

interface CustomField {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "select";
}

interface Pipeline {
  id: string;
  name: string;
  stages: number;
  default: boolean;
}

export function SettingsView() {
  const { t } = useLocale();
  const [stages, setStages] = useState(LEAD_STAGES);
  const [sla, setSla] = useState(SLA_POLICIES);
  const [fields, setFields] = useState<CustomField[]>([
    { id: "cf_1", name: "Industry", type: "select" },
    { id: "cf_2", name: "Employees", type: "number" },
    { id: "cf_3", name: "Renewal date", type: "date" },
    { id: "cf_4", name: "Account manager", type: "text" },
  ]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([
    { id: "pl_1", name: "Sales — Enterprise", stages: 7, default: true },
    { id: "pl_2", name: "Sales — SMB", stages: 5, default: false },
    { id: "pl_3", name: "Partnerships", stages: 4, default: false },
  ]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newPipelineName, setNewPipelineName] = useState("");

  function save() {
    toast.success(t("leados.toast.settingsSaved"));
  }

  function addField() {
    if (!newFieldName.trim()) return;
    setFields((prev) => [...prev, { id: `cf_${Date.now()}`, name: newFieldName, type: "text" }]);
    setNewFieldName("");
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function addPipeline() {
    if (!newPipelineName.trim()) return;
    setPipelines((prev) => [...prev, { id: `pl_${Date.now()}`, name: newPipelineName, stages: 7, default: false }]);
    setNewPipelineName("");
  }

  function removePipeline(id: string) {
    setPipelines((prev) => prev.filter((p) => p.id !== id));
  }

  function setDefaultPipeline(id: string) {
    setPipelines((prev) => prev.map((p) => ({ ...p, default: p.id === id })));
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="stages" className="gap-4">
        <TabsList className="bg-card/60 p-1">
          <TabsTrigger value="stages" className="gap-1.5">
            <Workflow className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("leados.settings.stages")}</span>
          </TabsTrigger>
          <TabsTrigger value="sla" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("leados.settings.slaPolicies")}</span>
          </TabsTrigger>
          <TabsTrigger value="fields" className="gap-1.5">
            <ListPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("leados.settings.customFields")}</span>
          </TabsTrigger>
          <TabsTrigger value="pipelines" className="gap-1.5">
            <Columns3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("leados.settings.pipelines")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Stages */}
        <TabsContent value="stages">
          <Card className="surface-elevated">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-lime" />
                <h3 className="text-sm font-semibold text-foreground">{t("leados.settings.stages")}</h3>
              </div>
              <Button size="sm" variant="outline" onClick={() => toast.info("Add stage (mock)")}>
                <Plus className="h-3.5 w-3.5" />
                {t("leados.settings.addStage")}
              </Button>
            </div>
            <CardContent className="p-4">
              <ul className="space-y-1">
                {stages.map((s, i) => {
                  const cls = toneClasses(s.tone === "muted" ? "muted" : s.tone);
                  return (
                    <motion.li
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: i * 0.02 }}
                      className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2"
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                      <span className={cn("h-2.5 w-2.5 rounded-full", cls.dot)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{t(s.labelKey)}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          {s.id} · {s.closed ? "closed" : "open"}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-border bg-muted/40 px-1.5 py-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {s.tone}
                      </Badge>
                    </motion.li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA policies */}
        <TabsContent value="sla">
          <Card className="surface-elevated">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <Clock className="h-4 w-4 text-cyan" />
              <h3 className="text-sm font-semibold text-foreground">{t("leados.settings.slaPolicies")}</h3>
            </div>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SlaInput
                  label={t("leados.settings.firstResponseTarget")}
                  value={sla.firstResponseHours}
                  onChange={(v) => setSla({ ...sla, firstResponseHours: v })}
                />
                <SlaInput
                  label={t("leados.settings.followUpTarget")}
                  value={sla.followUpHours}
                  onChange={(v) => setSla({ ...sla, followUpHours: v })}
                />
                <SlaInput
                  label={t("leados.settings.stageInactivityTarget")}
                  value={sla.stageInactivityDays}
                  onChange={(v) => setSla({ ...sla, stageInactivityDays: v })}
                />
              </div>
              <Separator className="my-4" />
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">Active policy:</span> first response within{" "}
                  <span className="text-lime">{sla.firstResponseHours}h</span>, follow-up every{" "}
                  <span className="text-amber">{sla.followUpHours}h</span>, alert after{" "}
                  <span className="text-rose">{sla.stageInactivityDays} days</span> of stage inactivity.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom fields */}
        <TabsContent value="fields">
          <Card className="surface-elevated">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <ListPlus className="h-4 w-4 text-violet" />
              <h3 className="text-sm font-semibold text-foreground">{t("leados.settings.customFields")}</h3>
            </div>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder={t("leados.settings.fieldName")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addField();
                  }}
                />
                <Button size="sm" onClick={addField}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("leados.settings.addField")}
                </Button>
              </div>
              <ul className="space-y-1">
                {fields.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2"
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{f.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        {f.id} · {t("leados.settings.fieldType")}: {f.type}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeField(f.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
                {fields.length === 0 && (
                  <li className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
                    {t("common.empty")}
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pipelines */}
        <TabsContent value="pipelines">
          <Card className="surface-elevated">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <Columns3 className="h-4 w-4 text-amber" />
              <h3 className="text-sm font-semibold text-foreground">{t("leados.settings.pipelines")}</h3>
            </div>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Input
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  placeholder={t("leados.settings.addPipeline")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addPipeline();
                  }}
                />
                <Button size="sm" onClick={addPipeline}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("leados.settings.addPipeline")}
                </Button>
              </div>
              <ul className="space-y-1">
                {pipelines.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2"
                  >
                    <Columns3 className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        {p.stages} stages · {p.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`def-${p.id}`} className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Default
                      </Label>
                      <Switch
                        id={`def-${p.id}`}
                        checked={p.default}
                        onCheckedChange={() => setDefaultPipeline(p.id)}
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removePipeline(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
                {pipelines.length === 0 && (
                  <li className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
                    {t("common.empty")}
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => toast.info(t("common.reset"))}>
          {t("common.reset")}
        </Button>
        <Button onClick={save}>
          <Save className="h-3.5 w-3.5" />
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

function SlaInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
      />
    </div>
  );
}
