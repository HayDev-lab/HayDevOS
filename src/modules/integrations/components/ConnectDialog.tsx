"use client";

/**
 * ConnectDialog — per-provider connect flow.
 *
 * Three flows:
 *  - oauth: simulated consent screen with scopes + "Authorize" button.
 *  - api_key: masked key input + secret (kept masked, server-side store).
 *  - webhook: generated ingress URL + signing secret (masked).
 *
 * Security emphasis shown in UI: PKCE/state note, redirect URL allowlist
 * reminder, "no plaintext in GET/logs" badge, HMAC requirement for webhook.
 *
 * On "connect" → calls onConnect(provider) and shows a success toast.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Link2,
  Webhook,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Provider, AuthType } from "../types";
import { CategoryBadge, AuthTypeBadge, NoPlaintextBadge } from "../shared";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  provider: Provider | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (provider: Provider, scopes: string[]) => void;
}

type Phase = "consent" | "authorizing" | "done";

export function ConnectDialog({ provider, open, onOpenChange, onConnect }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && provider && (
        <DialogContent className="max-w-2xl gap-0 p-0">
          <ConnectDialogInner
            key={provider.id}
            provider={provider}
            onOpenChange={onOpenChange}
            onConnect={onConnect}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

function ConnectDialogInner({
  provider,
  onOpenChange,
  onConnect,
}: {
  provider: Provider;
  onOpenChange: (open: boolean) => void;
  onConnect: (provider: Provider, scopes: string[]) => void;
}) {
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>("consent");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [webhookUrl] = useState(
    `https://api.haydev.os/hooks/${provider.id}/wh_${rand6()}`,
  );
  const [signingSecret] = useState(`whsec_${rand8()}••••••••${rand4()}`);
  const [scopes, setScopes] = useState<string[]>(
    provider.authType === "oauth" ? [...provider.requiredScopes] : [],
  );

  function authorize() {
    setPhase("authorizing");
    // Simulate the OAuth round-trip (PKCE challenge → provider → callback).
    setTimeout(() => {
      setPhase("done");
      if (provider) {
        onConnect(provider, scopes);
        toast.success(t("integration.connect.success", { name: provider.name }));
      }
      setTimeout(() => onOpenChange(false), 900);
    }, 1100);
  }

  function saveApiKey() {
    if (!apiKey.trim()) {
      toast.error(t("integration.connect.apiKeyRequired"));
      return;
    }
    if (!provider) return;
    setPhase("done");
    onConnect(provider, []);
    toast.success(t("integration.connect.success", { name: provider.name }));
    setTimeout(() => onOpenChange(false), 800);
  }

  function saveWebhook() {
    if (!provider) return;
    setPhase("done");
    onConnect(provider, []);
    toast.success(t("integration.connect.webhookCreated"));
    setTimeout(() => onOpenChange(false), 800);
  }

  function copy(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => undefined);
    }
    toast.success(t("integration.connect.copied"));
  }

  return (
    <>
      <DialogHeader className="border-b border-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/60">
                <provider.icon className="h-5 w-5 text-foreground" />
              </span>
              <div>
                <DialogTitle className="flex items-center gap-2 text-base">
                  {t("integration.connect.title", { name: provider.name })}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  {provider.description}
                </DialogDescription>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <CategoryBadge category={provider.category} />
                  <AuthTypeBadge authType={provider.authType} />
                  <NoPlaintextBadge />
                </div>
              </div>
            </div>
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] text-cyan hover:underline"
            >
              {t("integration.connect.docs")}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-5">
            {phase === "done" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center gap-3 py-10 text-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-success/40 bg-success/10 text-success">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <div className="text-sm font-semibold text-foreground">
                  {t("integration.connect.connected")}
                </div>
                <p className="max-w-sm text-xs text-muted-foreground">
                  {t("integration.connect.connectedSub")}
                </p>
              </motion.div>
            ) : provider.authType === "oauth" ? (
              <OAuthFlow
                provider={provider}
                scopes={scopes}
                setScopes={setScopes}
                phase={phase}
              />
            ) : provider.authType === "api_key" ? (
              <ApiKeyFlow
                apiKey={apiKey}
                apiSecret={apiSecret}
                setApiKey={setApiKey}
                setApiSecret={setApiSecret}
              />
            ) : provider.authType === "webhook" ? (
              <WebhookFlow
                webhookUrl={webhookUrl}
                signingSecret={signingSecret}
                onCopy={copy}
              />
            ) : (
              <NoneFlow provider={provider} />
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-border p-4">
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-success" />
            {t("integration.connect.pkceNote")}
          </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              {provider.authType === "oauth" && (
                <Button
                  size="sm"
                  onClick={authorize}
                  disabled={phase === "authorizing" || scopes.length === 0}
                  className="gap-1.5"
                >
                  {phase === "authorizing" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  {t("integration.connect.authorize")}
                </Button>
              )}
              {provider.authType === "api_key" && (
                <Button size="sm" onClick={saveApiKey} className="gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  {t("integration.connect.saveKey")}
                </Button>
              )}
              {provider.authType === "webhook" && (
                <Button size="sm" onClick={saveWebhook} className="gap-1.5">
                  <Webhook className="h-3.5 w-3.5" />
                  {t("integration.connect.createEndpoint")}
                </Button>
              )}
              {provider.authType === "none" && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (!provider) return;
                    onConnect(provider, []);
                    toast.success(t("integration.connect.success", { name: provider.name }));
                    onOpenChange(false);
                  }}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("integration.connect.enable")}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth flow — consent screen with scopes
// ─────────────────────────────────────────────────────────────────────────────

function OAuthFlow({
  provider,
  scopes,
  setScopes,
  phase,
}: {
  provider: Provider;
  scopes: string[];
  setScopes: (s: string[]) => void;
  phase: Phase;
}) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-cyan/30 bg-cyan/5 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan">
          <ShieldCheck className="h-4 w-4" />
          {t("integration.connect.consent")}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("integration.connect.consentSub", { name: provider.name })}
        </p>
      </div>

      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("integration.connect.scopes")}
        </div>
        <div className="flex flex-col gap-1.5">
          {provider.requiredScopes.map((scope) => {
            const checked = scopes.includes(scope);
            return (
              <label
                key={scope}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 text-xs transition-colors",
                  checked
                    ? "border-cyan/40 bg-cyan/5"
                    : "border-border bg-card/40 hover:bg-card/60",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => {
                    if (v) setScopes([...scopes, scope]);
                    else setScopes(scopes.filter((s) => s !== scope));
                  }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-[11px] font-medium text-foreground">
                    {t(`integration.scope.${scope}`)}
                  </div>
                  <code className="mt-0.5 block font-mono text-[9px] text-muted-foreground" title={scope}>
                    {scope}
                  </code>
                </div>
                {checked && (
                  <Badge className="bg-cyan/15 text-cyan border-cyan/30 px-1.5 py-0 text-[9px]">
                    {t("integration.connect.granted")}
                  </Badge>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-md border border-border bg-background/40 p-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("integration.connect.state")}
          </div>
          <code className="mt-0.5 block truncate font-mono text-[10px] text-foreground">
            state={rand8()}f3c2
          </code>
        </div>
        <div className="rounded-md border border-border bg-background/40 p-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("integration.connect.pkceVerifier")}
          </div>
          <code className="mt-0.5 block truncate font-mono text-[10px] text-foreground">
            code_challenge={rand8()}…{rand4()}
          </code>
        </div>
      </div>

      {phase === "authorizing" && (
        <div className="flex items-center gap-2 rounded-md border border-cyan/30 bg-cyan/5 p-2 text-xs text-cyan">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          {t("integration.connect.redirecting")}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// API key flow — masked inputs
// ─────────────────────────────────────────────────────────────────────────────

function ApiKeyFlow({
  apiKey,
  apiSecret,
  setApiKey,
  setApiSecret,
}: {
  apiKey: string;
  apiSecret: string;
  setApiKey: (v: string) => void;
  setApiSecret: (v: string) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-amber/30 bg-amber/5 p-3 text-[11px] text-amber">
        <div className="flex items-center gap-2 font-semibold">
          <Lock className="h-3.5 w-3.5" />
          {t("integration.connect.maskedNote")}
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {t("integration.connect.maskedNoteSub")}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="api-key" className="text-[10px] uppercase tracking-wider">
          {t("integration.connect.apiKeyLabel")}
        </Label>
        <Input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk_live_••••••••"
          className="font-mono text-xs"
          autoComplete="off"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="api-secret" className="text-[10px] uppercase tracking-wider">
          {t("integration.connect.apiSecretLabel")}
        </Label>
        <Input
          id="api-secret"
          type="password"
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
          placeholder="••••••••"
          className="font-mono text-xs"
          autoComplete="off"
        />
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <KeyRound className="h-3 w-3 text-amber" />
        {t("integration.connect.encryptionNote")}
      </div>
      {apiSecret && (
        <div className="rounded-md border border-border bg-background/40 p-2">
          <code className="font-mono text-[11px] text-foreground">
            {maskValue(apiSecret)}
          </code>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook flow — generated URL + signing secret
// ─────────────────────────────────────────────────────────────────────────────

function WebhookFlow({
  webhookUrl,
  signingSecret,
  onCopy,
}: {
  webhookUrl: string;
  signingSecret: string;
  onCopy: (text: string) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-violet/30 bg-violet/5 p-3 text-[11px] text-violet">
        <div className="flex items-center gap-2 font-semibold">
          <Webhook className="h-3.5 w-3.5" />
          {t("integration.connect.webhookNote")}
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {t("integration.connect.webhookNoteSub")}
        </p>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("integration.connect.ingressUrl")}
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-2">
          <code className="truncate font-mono text-[11px] text-foreground">{webhookUrl}</code>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1 px-2 text-xs"
            onClick={() => onCopy(webhookUrl)}
          >
            <Copy className="h-3 w-3" />
            {t("common.copy")}
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("integration.connect.signingSecret")}
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border border-amber/30 bg-amber/5 p-2">
          <code className="truncate font-mono text-[11px] text-amber">
            <Lock className="mr-1 inline h-3 w-3" />
            {signingSecret}
          </code>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1 px-2 text-xs"
            onClick={() => onCopy(signingSecret)}
          >
            <Copy className="h-3 w-3" />
            {t("common.copy")}
          </Button>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Link2 className="h-3 w-3" />
          {t("integration.connect.hmacNote")}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// None-flow — internal providers, no auth required
// ─────────────────────────────────────────────────────────────────────────────

function NoneFlow({ provider }: { provider: Provider }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-lime/30 bg-lime/5 p-3 text-[11px] text-lime">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("integration.connect.internalNote")}
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {t("integration.connect.internalNoteSub", { name: provider.name })}
        </p>
      </div>
      <div className="rounded-md border border-border bg-background/40 p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {t("integration.connect.serviceToken")}
        </div>
        <code className="mt-1 block font-mono text-[11px] text-foreground">
          svc_••••••••{rand4()}
        </code>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Lock className="h-3 w-3 text-amber" />
        {t("integration.connect.encryptionNote")}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function rand6(): string {
  return Math.random().toString(36).slice(2, 8);
}
function rand8(): string {
  return Math.random().toString(36).slice(2, 10);
}
function rand4(): string {
  return Math.random().toString(36).slice(2, 6);
}

function maskValue(v: string): string {
  if (v.length <= 6) return "••••••••";
  return `${v.slice(0, 2)}${"•".repeat(8)}${v.slice(-2)}`;
}

export default ConnectDialog;
