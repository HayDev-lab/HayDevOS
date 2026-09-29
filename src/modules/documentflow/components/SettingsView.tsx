"use client";

/**
 * SettingsView — AI provider, OCR languages, MIME limits, storage.
 *
 * AI provider block: shows Ollama Cloud (the active HayDevOS shared AI
 * provider registry entry) with endpoint, model, masked API key, enable
 * toggle, plus a second provider (OpenAI) for context. Save → toast.
 *
 * OCR language packs: per-language enable switches (hy/ru/en).
 *
 * MIME limits: table with type, MIME, max-size, enable.
 *
 * Storage config: bucket, region, endpoint, encryption (read-only display).
 */

import * as React from "react";
import { useState } from "react";
import {
  Cpu,
  Languages,
  FileCheck2,
  Database,
  Save,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import {
  docflowAiProviders,
  docflowOcrLangPacks,
  docflowMimeLimits,
  docflowStorageConfig,
  type DocAiProvider,
  type DocOcrLangPack,
  type DocMimeLimit,
} from "../data";
import { FileTypeBadge } from "../shared";

export function SettingsView() {
  const { t } = useLocale();
  const [providers, setProviders] = useState<DocAiProvider[]>(docflowAiProviders);
  const [ocrPacks, setOcrPacks] = useState<DocOcrLangPack[]>(docflowOcrLangPacks);
  const [mimeLimits, setMimeLimits] = useState<DocMimeLimit[]>(docflowMimeLimits);
  const [revealKey, setRevealKey] = useState<Record<string, boolean>>({});

  const toggleProvider = (id: string) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  const updateProvider = (id: string, patch: Partial<DocAiProvider>) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const toggleOcr = (code: string) => {
    setOcrPacks((prev) => prev.map((p) => (p.code === code ? { ...p, enabled: !p.enabled } : p)));
  };

  const toggleMime = (mime: string) => {
    setMimeLimits((prev) => prev.map((m) => (m.mime === mime ? { ...m, enabled: !m.enabled } : m)));
  };

  const updateMimeSize = (mime: string, sizeMb: number) => {
    setMimeLimits((prev) => prev.map((m) => (m.mime === mime ? { ...m, maxSizeMb: sizeMb } : m)));
  };

  const save = () => toast.success(t("docflow.settings.saved"));

  return (
    <div className="space-y-4">
      {/* AI Provider */}
      <Card className="surface-elevated">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Cpu size={16} className="text-cyan" />
                {t("docflow.settings.aiProvider")}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("docflow.settings.providerHint")}</p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={save}>
              <Save size={14} />
              {t("docflow.settings.save")}
            </Button>
          </div>

          <div className="space-y-3">
            {providers.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  p.enabled ? "border-lime/30 bg-lime/5" : "border-border bg-card",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{p.name}</span>
                      {p.enabled ? (
                        <Badge variant="outline" className="bg-lime/10 text-lime border-lime/30">
                          {t("docflow.settings.enabled")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          {t("common.paused")}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.endpoint}</p>
                  </div>
                  <Switch checked={p.enabled} onCheckedChange={() => toggleProvider(p.id)} />
                </div>

                <Separator className="my-3" />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("docflow.settings.endpoint")}</Label>
                    <Input
                      value={p.endpoint}
                      onChange={(e) => updateProvider(p.id, { endpoint: e.target.value })}
                      className="h-8 font-mono text-xs"
                      disabled={!p.enabled}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("docflow.settings.model")}</Label>
                    <Input
                      value={p.model}
                      onChange={(e) => updateProvider(p.id, { model: e.target.value })}
                      className="h-8 font-mono text-xs"
                      disabled={!p.enabled}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">{t("docflow.settings.apiKey")}</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <KeyRound size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={p.apiKeyMasked}
                          onChange={(e) => updateProvider(p.id, { apiKeyMasked: e.target.value })}
                          className="h-8 pl-8 font-mono text-xs"
                          disabled={!p.enabled}
                          type={revealKey[p.id] ? "text" : "password"}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground"
                        onClick={() => setRevealKey((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                        disabled={!p.enabled}
                        aria-label="Toggle key visibility"
                      >
                        {revealKey[p.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* OCR languages */}
        <Card className="surface-elevated">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Languages size={16} className="text-violet" />
              {t("docflow.settings.ocrLangs")}
            </h3>
            <Separator />
            <ul className="space-y-2">
              {ocrPacks.map((pack) => (
                <li
                  key={pack.code}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-violet/10 font-mono uppercase text-violet border-violet/30">
                      {pack.code}
                    </Badge>
                    <span className="text-sm">{pack.name}</span>
                  </div>
                  <Switch checked={pack.enabled} onCheckedChange={() => toggleOcr(pack.code)} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Storage config */}
        <Card className="surface-elevated">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Database size={16} className="text-amber" />
              {t("docflow.settings.storage")}
            </h3>
            <Separator />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{t("docflow.settings.bucket")}</dt>
                <dd className="font-mono text-xs">{docflowStorageConfig.bucket}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("docflow.settings.region")}</dt>
                <dd className="font-mono text-xs">{docflowStorageConfig.region}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">{t("docflow.settings.endpoint")}</dt>
                <dd className="font-mono text-xs">{docflowStorageConfig.endpoint}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">{t("docflow.settings.encryption")}</dt>
                <dd>
                  <Badge variant="outline" className="bg-lime/10 text-lime border-lime/30">
                    {docflowStorageConfig.encryption}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* MIME limits */}
      <Card className="surface-elevated">
        <CardContent className="space-y-3 p-4 sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FileCheck2 size={16} className="text-lime" />
            {t("docflow.settings.mimeLimits")}
          </h3>
          <Separator />
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[auto_minmax(0,1.5fr)_auto_auto] items-center gap-3 border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span>{t("docflow.inbox.type")}</span>
              <span>MIME</span>
              <span>Max MB</span>
              <span className="text-right">{t("docflow.settings.enabled")}</span>
            </div>
            <div className="divide-y divide-border/60">
              {mimeLimits.map((m) => (
                <div
                  key={m.mime}
                  className="grid grid-cols-[auto_minmax(0,1.5fr)_auto_auto] items-center gap-3 px-3 py-2 text-xs"
                >
                  <FileTypeBadge type={m.type} />
                  <span className="truncate font-mono text-muted-foreground">{m.mime}</span>
                  <Input
                    type="number"
                    value={m.maxSizeMb}
                    onChange={(e) => updateMimeSize(m.mime, Number(e.target.value) || 0)}
                    className="h-7 w-20 font-mono text-xs"
                    disabled={!m.enabled}
                  />
                  <div className="flex justify-end">
                    <Switch checked={m.enabled} onCheckedChange={() => toggleMime(m.mime)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button size="sm" className="gap-1.5" onClick={save}>
              <Save size={14} />
              {t("docflow.settings.save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
