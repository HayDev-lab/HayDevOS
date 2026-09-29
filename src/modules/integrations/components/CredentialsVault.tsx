"use client";

/**
 * CredentialsVault — credential manager.
 *
 * Lists all stored credentials with: provider, type, created, last rotated,
 * expiresAt — every value MASKED. "Rotate" action per credential. "Reveal"
 * shows a server-only-decryption note instead of the plaintext. Expiry
 * warnings for credentials expiring within 14 days.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  KeyRound,
  Lock,
  ShieldCheck,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Search,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, formatDate, relativeTime } from "@/lib/utils";
import type { Credential, Provider } from "../types";
import { ProviderIcon, SectionHeader, EmptyState, NoPlaintextBadge } from "../shared";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

interface Props {
  credentials: Credential[];
  providers: Provider[];
  onRotate: (credential: Credential) => void;
}

export function CredentialsVault({ credentials, providers, onRotate }: Props) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [reveal, setReveal] = useState(false);

  const providerById = useMemo(() => {
    const map = new Map<string, Provider>();
    providers.forEach((p) => map.set(p.id, p));
    return map;
  }, [providers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return credentials.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (!q) return true;
      const prov = providerById.get(c.providerId);
      return (
        c.label.toLowerCase().includes(q) ||
        (prov?.name.toLowerCase().includes(q) ?? false) ||
        c.maskedValue.toLowerCase().includes(q)
      );
    });
  }, [credentials, query, typeFilter, providerById]);

  function isExpiringSoon(c: Credential) {
    if (!c.expiresAt) return false;
    const days = (new Date(c.expiresAt).getTime() - Date.now()) / 86400000;
    return days <= 14 && days >= 0;
  }
  function isExpired(c: Credential) {
    if (!c.expiresAt) return false;
    return new Date(c.expiresAt).getTime() < Date.now();
  }

  const expiringCount = credentials.filter(isExpiringSoon).length;
  const expiredCount = credentials.filter(isExpired).length;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={t("integration.vault.title")}
        sub={t("integration.vault.sub")}
        right={<NoPlaintextBadge />}
      />

      {/* Security note */}
      <div className="flex flex-wrap items-start gap-2 rounded-lg border border-success/30 bg-success/5 p-3 text-[11px] text-success">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{t("integration.vault.securityNote")}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <VaultStat
          label={t("integration.vault.total")}
          value={credentials.length}
          tone="cyan"
          icon={<KeyRound className="h-3.5 w-3.5" />}
        />
        <VaultStat
          label={t("integration.vault.healthy")}
          value={credentials.filter((c) => !isExpiringSoon(c) && !isExpired(c)).length}
          tone="lime"
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        />
        <VaultStat
          label={t("integration.vault.expiring")}
          value={expiringCount}
          tone="amber"
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
        <VaultStat
          label={t("integration.vault.expired")}
          value={expiredCount}
          tone="rose"
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder={t("integration.vault.filterType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="oauth_token">{t("integration.credType.oauth_token")}</SelectItem>
              <SelectItem value="api_key">{t("integration.credType.api_key")}</SelectItem>
              <SelectItem value="signing_secret">{t("integration.credType.signing_secret")}</SelectItem>
              <SelectItem value="webhook_url">{t("integration.credType.webhook_url")}</SelectItem>
              <SelectItem value="none">{t("integration.credType.none")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 rounded-md border border-border bg-card/40 px-2 py-1">
            <Switch checked={reveal} onCheckedChange={setReveal} className="scale-90" />
            <span className="text-[11px] text-muted-foreground">
              {t("integration.vault.revealToggle")}
            </span>
          </div>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("integration.vault.search")}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Cards */}
      <ScrollArea className="max-h-[680px]">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((cred, i) => {
            const prov = providerById.get(cred.providerId);
            const soon = isExpiringSoon(cred);
            const expired = isExpired(cred);
            return (
              <motion.div
                key={cred.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.15) }}
              >
                <Card
                  className={cn(
                    "surface-elevated py-0",
                    expired && "border-rose/40",
                    soon && "border-amber/40",
                  )}
                >
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {prov && <ProviderIcon provider={prov} size="sm" />}
                        <div>
                          <div className="text-xs font-semibold text-foreground">
                            {cred.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {prov?.name ?? cred.providerId} · {t(`integration.credType.${cred.type}`)}
                          </div>
                        </div>
                      </div>
                      {cred.active ? (
                        <Badge className="bg-lime/15 text-lime border-lime/30 px-1.5 py-0 text-[9px]">
                          {t("integration.vault.active")}
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground border-border px-1.5 py-0 text-[9px]">
                          {t("integration.vault.inactive")}
                        </Badge>
                      )}
                    </div>

                    {/* Masked value */}
                    <div className="rounded-md border border-border bg-background/40 p-2">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {t("integration.vault.value")}
                        </span>
                        <Lock className="h-3 w-3 text-amber" />
                      </div>
                      <code className="font-mono text-[11px] text-foreground">
                        {cred.maskedValue}
                      </code>
                      {reveal && (
                        <div className="mt-2 flex items-start gap-1.5 rounded border border-amber/30 bg-amber/5 p-2 text-[10px] text-amber">
                          <EyeOff className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>{t("integration.cred.serverOnlyNote")}</span>
                        </div>
                      )}
                    </div>

                    {/* Meta grid */}
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div className="rounded-md border border-border bg-background/40 p-1.5">
                        <div className="uppercase tracking-wider text-muted-foreground">
                          {t("integration.vault.created")}
                        </div>
                        <div className="mt-0.5 text-foreground">{formatDate(cred.createdAt, locale)}</div>
                      </div>
                      <div className="rounded-md border border-border bg-background/40 p-1.5">
                        <div className="uppercase tracking-wider text-muted-foreground">
                          {t("integration.vault.rotated")}
                        </div>
                        <div className="mt-0.5 text-foreground">
                          {relativeTime(cred.lastRotatedAt, locale)}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "rounded-md border p-1.5",
                          expired
                            ? "border-rose/40 bg-rose/5"
                            : soon
                              ? "border-amber/40 bg-amber/5"
                              : "border-border bg-background/40",
                        )}
                      >
                        <div className="uppercase tracking-wider text-muted-foreground">
                          {t("integration.vault.expires")}
                        </div>
                        <div
                          className={cn(
                            "mt-0.5 text-foreground",
                            expired ? "text-rose" : soon ? "text-amber" : "",
                          )}
                        >
                          {cred.expiresAt ? formatDate(cred.expiresAt, locale) : "—"}
                        </div>
                      </div>
                    </div>

                    {/* Warning banners */}
                    {expired && (
                      <div className="flex items-center gap-1.5 rounded-md border border-rose/30 bg-rose/5 p-2 text-[10px] text-rose">
                        <AlertTriangle className="h-3 w-3" />
                        {t("integration.vault.expiredWarn")}
                      </div>
                    )}
                    {soon && !expired && (
                      <div className="flex items-center gap-1.5 rounded-md border border-amber/30 bg-amber/5 p-2 text-[10px] text-amber">
                        <AlertTriangle className="h-3 w-3" />
                        {t("integration.vault.expiringWarn")}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <ShieldCheck className="h-3 w-3 text-success" />
                        {t("integration.vault.encrypted")}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onRotate(cred);
                          toast.success(t("integration.vault.rotatedToast"));
                        }}
                        className="gap-1.5"
                      >
                        <RotateCw className="h-3.5 w-3.5 text-amber" />
                        {t("integration.vault.rotate")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {filtered.length === 0 && (
            <div className="lg:col-span-2">
              <EmptyState
                icon={<KeyRound className="h-5 w-5 text-muted-foreground" />}
                message={t("integration.vault.empty")}
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function VaultStat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "lime" | "amber" | "rose" | "cyan";
  icon: React.ReactNode;
}) {
  const cls = {
    lime: "border-lime/30 bg-lime/10 text-lime",
    amber: "border-amber/30 bg-amber/10 text-amber",
    rose: "border-rose/30 bg-rose/10 text-rose",
    cyan: "border-cyan/30 bg-cyan/10 text-cyan",
  }[tone];
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border p-3", cls)}>
      {icon}
      <div>
        <div className="text-lg font-semibold leading-none text-foreground">{value}</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}

export default CredentialsVault;
