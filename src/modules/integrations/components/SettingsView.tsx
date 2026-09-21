"use client";

/**
 * SettingsView — global Integration Hub settings.
 *
 * Sections:
 *  - Webhook ingress (base URL, max body size KB, require HMAC, idempotency window).
 *  - Rate limits (per-min, auto-disable after N failures).
 *  - Security (SSRF/private-network blocking, reject self-signed TLS,
 *    redirect URL allowlist).
 *  - Default sync schedule (cron).
 *  - Save → toast.
 *
 * Security emphasis shown in UI: SSRF/private/metadata blocking ON by default,
 * redirect validation allowlist, idempotency window, HMAC required.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Webhook,
  Save,
  Plus,
  X,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { IntegrationSettings } from "../types";
import { SectionHeader, NoPlaintextBadge } from "../shared";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface Props {
  initial: IntegrationSettings;
  onSave: (patch: IntegrationSettings) => void;
}

export function SettingsView({ initial, onSave }: Props) {
  const { t } = useLocale();
  const [draft, setDraft] = useState<IntegrationSettings>(initial);
  const [newRedirect, setNewRedirect] = useState("");

  function patch(p: Partial<IntegrationSettings>) {
    setDraft((prev) => ({ ...prev, ...p }));
  }

  function save() {
    onSave(draft);
    toast.success(t("integration.settings.saved"));
  }

  function addRedirect() {
    if (!newRedirect.trim()) return;
    if (!newRedirect.startsWith("https://")) {
      toast.error(t("integration.settings.redirectHttps"));
      return;
    }
    if (draft.redirectAllowlist.includes(newRedirect)) {
      toast.error(t("integration.settings.redirectDup"));
      return;
    }
    patch({ redirectAllowlist: [...draft.redirectAllowlist, newRedirect] });
    setNewRedirect("");
  }

  function removeRedirect(url: string) {
    patch({ redirectAllowlist: draft.redirectAllowlist.filter((u) => u !== url) });
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={t("integration.settings.title")}
        sub={t("integration.settings.sub")}
        right={<NoPlaintextBadge />}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Webhook ingress */}
        <Card className="surface-elevated py-0">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Webhook className="h-3.5 w-3.5 text-violet" />
              {t("integration.settings.webhook")}
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider">
                {t("integration.settings.webhookBaseUrl")}
              </Label>
              <Input
                value={draft.webhookBaseUrl}
                onChange={(e) => patch({ webhookBaseUrl: e.target.value })}
                className="mt-1 font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase tracking-wider">
                  {t("integration.settings.maxBodySize")}
                </Label>
                <Input
                  type="number"
                  value={draft.maxBodySizeKb}
                  onChange={(e) => patch({ maxBodySizeKb: Number(e.target.value) })}
                  className="mt-1 font-mono text-xs"
                />
                <div className="mt-0.5 text-[10px] text-muted-foreground">KB</div>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider">
                  {t("integration.settings.idempotency")}
                </Label>
                <Input
                  type="number"
                  value={draft.idempotencyWindowSec}
                  onChange={(e) => patch({ idempotencyWindowSec: Number(e.target.value) })}
                  className="mt-1 font-mono text-xs"
                />
                <div className="mt-0.5 text-[10px] text-muted-foreground">sec</div>
              </div>
            </div>

            <ToggleRow
              icon={<ShieldCheck className="h-3.5 w-3.5 text-success" />}
              label={t("integration.settings.requireHmac")}
              hint={t("integration.settings.requireHmacHint")}
              checked={draft.requireHmac}
              onCheckedChange={(v) => patch({ requireHmac: v })}
            />
          </CardContent>
        </Card>

        {/* Rate limits */}
        <Card className="surface-elevated py-0">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-cyan" />
              {t("integration.settings.rateLimits")}
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider">
                {t("integration.settings.rateLimitPerMin")}
              </Label>
              <Input
                type="number"
                value={draft.rateLimitPerMin}
                onChange={(e) => patch({ rateLimitPerMin: Number(e.target.value) })}
                className="mt-1 font-mono text-xs"
              />
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {t("integration.settings.rateLimitHint")}
              </div>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider">
                {t("integration.settings.autoDisable")}
              </Label>
              <Input
                type="number"
                value={draft.autoDisableAfterFailures}
                onChange={(e) => patch({ autoDisableAfterFailures: Number(e.target.value) })}
                className="mt-1 font-mono text-xs"
              />
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {t("integration.settings.autoDisableHint")}
              </div>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider">
                {t("integration.settings.defaultSyncCron")}
              </Label>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background/40 p-2">
                <Clock className="h-3.5 w-3.5 text-violet" />
                <code className="font-mono text-[11px] text-foreground">
                  {draft.defaultSyncCron}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="surface-elevated py-0">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5 text-amber" />
              {t("integration.settings.security")}
            </div>

            <ToggleRow
              icon={<ShieldCheck className="h-3.5 w-3.5 text-success" />}
              label={t("integration.settings.blockPrivate")}
              hint={t("integration.settings.blockPrivateHint")}
              checked={draft.blockPrivateNetworks}
              onCheckedChange={(v) => patch({ blockPrivateNetworks: v })}
            />
            <ToggleRow
              icon={<ShieldCheck className="h-3.5 w-3.5 text-success" />}
              label={t("integration.settings.rejectSelfSigned")}
              hint={t("integration.settings.rejectSelfSignedHint")}
              checked={draft.rejectSelfSignedTls}
              onCheckedChange={(v) => patch({ rejectSelfSignedTls: v })}
            />

            <div className="rounded-md border border-amber/30 bg-amber/5 p-2 text-[10px] text-amber">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="h-3 w-3" />
                {t("integration.settings.ssrfTitle")}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {t("integration.settings.ssrfBody")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Redirect allowlist */}
        <Card className="surface-elevated py-0">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Link2 className="h-3.5 w-3.5 text-cyan" />
              {t("integration.settings.redirectAllowlist")}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t("integration.settings.redirectHint")}
            </p>

            <div className="flex gap-2">
              <Input
                value={newRedirect}
                onChange={(e) => setNewRedirect(e.target.value)}
                placeholder="https://app.haydev.os/oauth/callback"
                className="font-mono text-xs"
              />
              <Button size="sm" onClick={addRedirect} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t("integration.settings.add")}
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              {draft.redirectAllowlist.map((url) => (
                <motion.div
                  key={url}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-2"
                >
                  <code className="truncate font-mono text-[10px] text-foreground">{url}</code>
                  <button
                    type="button"
                    onClick={() => removeRedirect(url)}
                    className="shrink-0 text-muted-foreground hover:text-rose"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
              {draft.redirectAllowlist.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-3 text-center text-[10px] text-muted-foreground">
                  {t("integration.settings.noRedirects")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Globe className="h-3 w-3 text-cyan" />
          {t("integration.settings.applyNote")}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-cyan/30 bg-cyan/10 text-cyan">
            <ShieldCheck className="mr-1 h-3 w-3" />
            {t("integration.settings.secured")}
          </Badge>
          <Button size="sm" onClick={save} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {t("integration.settings.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-background/40 p-2.5">
      <div className="flex items-start gap-2">
        {icon}
        <div>
          <div className="text-xs font-medium text-foreground">{label}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default SettingsView;
