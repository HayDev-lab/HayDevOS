"use client";

import { useWorkspaceSection } from "@/lib/workspace-navigation";

/**
 * IntegrationHubView — top-level view for the HayDevOS Integration Hub.
 *
 * Tabs: Providers | Connected | Credentials | Webhooks | Sync | Audit |
 *       Analytics | Settings.
 *
 * Holds the in-memory state of integrations, credentials, webhook events,
 * sync runs, the audit log, and the global settings object. Sub-views are
 * pure(ish): they emit intents (test/sync/rotate/revoke/replay/save) and the
 * parent applies them to the shared state.
 *
 * Security emphasis (KEY — surfaced in UI):
 *  - Provider onboarding is delegated to the server-managed connection flow.
 *  - HMAC-SHA256 signed webhooks (WebhooksView).
 *  - Server-only decryption; UI never holds plaintext (CredentialsVault,
 *    IntegrationDetail reveal note).
 *  - SSRF/private-network/metadata blocking (SettingsView default ON).
 *  - Redirect URL validation allowlist (SettingsView).
 *  - Idempotency keys on every inbound event (WebhooksView table).
 *  - "No plaintext exposure" badge in header + every credential surface.
 */

import { motion } from "framer-motion";
import {
Activity,
AlertTriangle,
Plug,
Webhook
} from "lucide-react";
import { useMemo,useState } from "react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import {
integrationAudit as seedAudit,
credentials as seedCredentials,
integrations as seedIntegrations,
providers as seedProviders,
integrationSettings as seedSettings,
syncRuns as seedSyncRuns,
webhookEvents as seedWebhookEvents,
webhookEndpoints,
} from "./data";
import type {
Credential,
Integration,
IntegrationAuditAction,
IntegrationAuditEntry,
IntegrationSettings,
Provider,
SyncRun,
WebhookEvent,
} from "./types";

import { Badge } from "@/components/ui/badge";
import { Tabs,TabsContent,TabsList,TabsTrigger } from "@/components/core/WorkspacePages";

import { AnalyticsView } from "./components/AnalyticsView";
import { AuditView } from "./components/AuditView";
import { ConnectedView } from "./components/ConnectedView";
import { CredentialsVault } from "./components/CredentialsVault";
import { IntegrationDetail } from "./components/IntegrationDetail";
import { ProvidersCatalog } from "./components/ProvidersCatalog";
import { SettingsView } from "./components/SettingsView";
import { SyncView } from "./components/SyncView";
import { WebhooksView } from "./components/WebhooksView";
import {
localizeCapability,
localizeDisplayText,
localizeProvider,
} from "./localization";
import { NoPlaintextBadge } from "./shared";

type TabId =
  | "providers"
  | "connected"
  | "credentials"
  | "webhooks"
  | "sync"
  | "audit"
  | "analytics"
  | "settings";

export function IntegrationHubView() {
  const { t, locale } = useLocale();
  const [tab, setTab] = useWorkspaceSection<TabId>("connect", "providers");

  // Shared in-memory state.
  const [integrations, setIntegrations] = useState<Integration[]>(seedIntegrations);
  const [credentials, setCredentials] = useState<Credential[]>(seedCredentials);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>(seedWebhookEvents);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>(seedSyncRuns);
  const [audit, setAudit] = useState<IntegrationAuditEntry[]>(seedAudit);
  const [settings, setSettings] = useState<IntegrationSettings>(seedSettings);

  const localizedProviders = useMemo(
    () => seedProviders.map((provider) => localizeProvider(provider, locale)),
    [locale],
  );
  const localizedIntegrations = useMemo(
    () =>
      integrations.map((integration) => ({
        ...integration,
        label: localizeDisplayText(integration.label, locale),
        capabilitiesInUse: integration.capabilitiesInUse.map((capability) =>
          localizeCapability(capability, locale),
        ),
      })),
    [integrations, locale],
  );
  const localizedCredentials = useMemo(
    () =>
      credentials.map((credential) => ({
        ...credential,
        label: localizeDisplayText(credential.label, locale),
      })),
    [credentials, locale],
  );
  const localizedEndpoints = useMemo(
    () =>
      webhookEndpoints.map((endpoint) => ({
        ...endpoint,
        name: localizeDisplayText(endpoint.name, locale),
      })),
    [locale],
  );

  // Dialog / drawer state.
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);

  const connectedProviderIds = useMemo(
    () => new Set(integrations.map((i) => i.providerId)),
    [integrations],
  );

  const selectedIntegration = useMemo(
    () => localizedIntegrations.find((i) => i.id === selectedIntegrationId) ?? null,
    [localizedIntegrations, selectedIntegrationId],
  );
  const selectedProvider = selectedIntegration
    ? localizedProviders.find((provider) => provider.id === selectedIntegration.providerId) ?? null
    : null;
  const selectedCredential = selectedIntegration
    ? localizedCredentials.find((credential) => credential.id === selectedIntegration.credentialId) ?? null
    : null;

  // Derived per-integration data for the detail drawer.
  const selectedAudit = useMemo(
    () =>
      selectedIntegration
        ? audit
            .filter(
              (a) =>
                a.integrationId === selectedIntegration.id ||
                a.providerId === selectedIntegration.providerId,
            )
            .slice(0, 6)
        : [],
    [audit, selectedIntegration],
  );
  const selectedSyncRuns = useMemo(
    () =>
      selectedIntegration
        ? syncRuns.filter((r) => r.integrationId === selectedIntegration.id)
        : [],
    [syncRuns, selectedIntegration],
  );
  const selectedEndpoints = useMemo(
    () =>
      selectedProvider
        ? localizedEndpoints.filter((w) => w.providerId === selectedProvider.id)
        : [],
    [localizedEndpoints, selectedProvider],
  );
  const selectedEvents = useMemo(
    () =>
      selectedProvider
        ? webhookEvents.filter((e) => e.providerId === selectedProvider.id)
        : [],
    [webhookEvents, selectedProvider],
  );

  // Header stat strip counts.
  const errorCount = integrations.filter((i) => i.status === "error").length;
  const reauthCount = integrations.filter((i) => i.status === "reauth_required").length;
  const expiringCount = useMemo(
    () =>
      credentials.filter((c) => {
        if (!c.expiresAt) return false;
        const days = (new Date(c.expiresAt).getTime() - Date.now()) / 86400000;
        return days <= 14;
      }).length,
    [credentials],
  );
  const events24h = useMemo(() => webhookEvents.length, [webhookEvents]);

  // ─────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────

  function openConnect(provider: Provider) {
    toast.info(t("integration.connect.serverRequired", { name: provider.name }));
  }

  function handleTest(integration: Integration) {
    addAudit({
      action: "test",
      providerId: integration.providerId,
      integrationId: integration.id,
      message: `Connectivity test: 200 OK (latency ${300 + Math.floor(Math.random() * 400)}ms).`,
    });
  }

  function handleSync(integration: Integration) {
    const newRun: SyncRun = {
      id: `sr_new_${Date.now()}`,
      orgId: integration.orgId,
      integrationId: integration.id,
      providerId: integration.providerId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 200 + Math.floor(Math.random() * 1200),
      recordsIn: Math.floor(Math.random() * 200),
      recordsOut: 0,
      status: "success",
      error: null,
      triggeredBy: "manual",
    };
    newRun.recordsOut = newRun.recordsIn;
    setSyncRuns((prev) => [newRun, ...prev]);
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === integration.id
          ? { ...i, lastSyncAt: newRun.finishedAt, updatedAt: new Date().toISOString() }
          : i,
      ),
    );
    addAudit({
      action: "sync",
      providerId: integration.providerId,
      integrationId: integration.id,
      message: `Manual sync completed: ${newRun.recordsIn} records in / ${newRun.recordsOut} out (${newRun.durationMs}ms).`,
    });
  }

  function handleRefreshAuth(integration: Integration) {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === integration.id
          ? {
              ...i,
              status: "connected",
              healthScore: Math.min(100, i.healthScore + 20),
              updatedAt: new Date().toISOString(),
            }
          : i,
      ),
    );
    addAudit({
      action: "refresh_auth",
      providerId: integration.providerId,
      integrationId: integration.id,
      message: `Refreshed OAuth tokens (${integration.providerId}). Status: connected.`,
    });
  }

  function handleDisconnect(integration: Integration) {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === integration.id
          ? {
              ...i,
              status: "disconnected",
              healthScore: 0,
              updatedAt: new Date().toISOString(),
            }
          : i,
      ),
    );
    setCredentials((prev) =>
      prev.map((c) =>
        c.id === integration.credentialId ? { ...c, active: false } : c,
      ),
    );
    addAudit({
      action: "disconnect",
      providerId: integration.providerId,
      integrationId: integration.id,
      message: `Disconnected ${integration.label}. Tokens revoked.`,
    });
  }

  function handleRotate(credential: Credential) {
    setCredentials((prev) =>
      prev.map((c) =>
        c.id === credential.id
          ? {
              ...c,
              maskedValue: maskRef(c.type === "signing_secret" ? "webhook" : c.type === "oauth_token" ? "oauth" : "api_key"),
              lastRotatedAt: new Date().toISOString(),
              expiresAt: c.type === "oauth_token" ? newFutureISO(60) : c.expiresAt,
            }
          : c,
      ),
    );
    addAudit({
      action: "rotate_credential",
      providerId: credential.providerId,
      integrationId: credential.integrationId,
      message: `Rotated ${credential.label}. Previous value revoked after grace period.`,
    });
  }

  function handleRevoke() {
    if (!selectedIntegration) return;
    setCredentials((prev) =>
      prev.map((c) =>
        c.id === selectedIntegration.credentialId ? { ...c, active: false } : c,
      ),
    );
    addAudit({
      action: "revoke_credential",
      providerId: selectedIntegration.providerId,
      integrationId: selectedIntegration.id,
      message: `Revoked credential for ${selectedIntegration.label}.`,
    });
  }

  function handleReplay(event: WebhookEvent) {
    setWebhookEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? {
              ...e,
              status: "replayed",
              processedAt: new Date().toISOString(),
            }
          : e,
      ),
    );
    addAudit({
      action: "webhook_replayed",
      providerId: event.providerId ?? "signed_webhook",
      integrationId: null,
      message: `Replayed event ${event.eventId} (${event.eventType}). Result: delivered (200).`,
    });
  }

  function handleSaveSettings(next: IntegrationSettings) {
    setSettings(next);
    addAudit({
      action: "config_updated",
      providerId: "signed_webhook",
      integrationId: null,
      message: `Updated Integration Hub settings (rate=${next.rateLimitPerMin}/min, body=${next.maxBodySizeKb}KB, HMAC=${next.requireHmac ? "on" : "off"}, SSRF block=${next.blockPrivateNetworks ? "on" : "off"}).`,
    });
  }

  function addAudit(entry: {
    action: IntegrationAuditAction;
    providerId: string;
    integrationId: string | null;
    message: string;
  }) {
    const newEntry: IntegrationAuditEntry = {
      id: `al_new_${Date.now()}`,
      orgId: "org_haydev",
      actor: "Aram Hayrapetyan",
      action: entry.action,
      providerId: entry.providerId,
      integrationId: entry.integrationId,
      ip: "146.70.•••.•••",
      userAgent: "Mozilla/5.0 (Macintosh) Chrome/127",
      message: entry.message,
      createdAt: new Date().toISOString(),
    };
    setAudit((prev) => [newEntry, ...prev]);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mb-5 flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan/10 text-cyan glow-cyan">
                <Plug className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("integration.title")}
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("integration.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HeaderStat
              icon={<Activity className="h-3.5 w-3.5" />}
              tone="lime"
              label={t("integration.status.connected")}
              value={integrations.filter((i) => i.status === "connected").length}
            />
            <HeaderStat
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              tone="amber"
              label={t("integration.tab.credentials")}
              value={expiringCount}
            />
            <HeaderStat
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              tone="rose"
              label={t("integration.status.error")}
              value={errorCount + reauthCount}
            />
            <HeaderStat
              icon={<Webhook className="h-3.5 w-3.5" />}
              tone="cyan"
              label={t("integration.tab.webhooks")}
              value={events24h}
            />
            <NoPlaintextBadge />
          </div>
        </div>
      </motion.div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="gap-4">
        <TabsList className="glass flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl p-1">
          <TabsTrigger value="providers">{t("integration.tab.providers")}</TabsTrigger>
          <TabsTrigger value="connected">{t("integration.tab.connected")}</TabsTrigger>
          <TabsTrigger value="credentials" className="gap-1.5">
            {t("integration.tab.credentials")}
            {expiringCount > 0 && (
              <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-amber/15 text-amber border-amber/30">
                {expiringCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="webhooks">{t("integration.tab.webhooks")}</TabsTrigger>
          <TabsTrigger value="sync">{t("integration.tab.sync")}</TabsTrigger>
          <TabsTrigger value="audit">{t("integration.tab.audit")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("integration.tab.analytics")}</TabsTrigger>
          <TabsTrigger value="settings">{t("integration.tab.settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="mt-0">
          <ProvidersCatalog
            providers={localizedProviders}
            connectedProviderIds={connectedProviderIds}
            onConnect={openConnect}
          />
        </TabsContent>
        <TabsContent value="connected" className="mt-0">
          <ConnectedView
            integrations={localizedIntegrations}
            providers={localizedProviders}
            onSelect={(i) => setSelectedIntegrationId(i.id)}
            onTest={handleTest}
            onSync={handleSync}
            onRefreshAuth={handleRefreshAuth}
            onDisconnect={handleDisconnect}
          />
        </TabsContent>
        <TabsContent value="credentials" className="mt-0">
          <CredentialsVault
            credentials={localizedCredentials}
            providers={localizedProviders}
            onRotate={handleRotate}
          />
        </TabsContent>
        <TabsContent value="webhooks" className="mt-0">
          <WebhooksView
            endpoints={localizedEndpoints}
            events={webhookEvents}
            providers={localizedProviders}
            onReplay={handleReplay}
          />
        </TabsContent>
        <TabsContent value="sync" className="mt-0">
          <SyncView
            runs={syncRuns}
            integrations={localizedIntegrations}
            providers={localizedProviders}
            settings={settings}
            onRunNow={handleSync}
            onUpdateSettings={(p) => setSettings((prev) => ({ ...prev, ...p }))}
          />
        </TabsContent>
        <TabsContent value="audit" className="mt-0">
          <AuditView audit={audit} providers={localizedProviders} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-0">
          <AnalyticsView integrations={integrations} credentials={credentials} />
        </TabsContent>
        <TabsContent value="settings" className="mt-0">
          <SettingsView initial={settings} onSave={handleSaveSettings} />
        </TabsContent>
      </Tabs>

      {/* Dialogs / drawers */}
      <IntegrationDetail
        integration={selectedIntegration}
        provider={selectedProvider}
        credential={selectedCredential}
        audit={selectedAudit}
        syncRuns={selectedSyncRuns}
        webhookEndpoints={selectedEndpoints}
        webhookEvents={selectedEvents}
        onClose={() => setSelectedIntegrationId(null)}
        onRotate={() => {
          if (selectedCredential) handleRotate(selectedCredential);
        }}
        onRevoke={handleRevoke}
        onSync={() => {
          if (selectedIntegration) {
            handleSync(selectedIntegration);
            toast.success(t("integration.connected.syncToast"));
          }
        }}
        onTest={() => {
          if (selectedIntegration) {
            handleTest(selectedIntegration);
            toast.success(t("integration.connected.testToast"));
          }
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function HeaderStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "lime" | "amber" | "rose" | "cyan";
}) {
  const toneCls = {
    lime: "border-lime/30 bg-lime/10 text-lime",
    amber: "border-amber/30 bg-amber/10 text-amber",
    rose: "border-rose/30 bg-rose/10 text-rose",
    cyan: "border-cyan/30 bg-cyan/10 text-cyan",
  }[tone];
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${toneCls}`}
    >
      {icon}
      <span className="font-medium text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function maskRef(authType: "oauth" | "api_key" | "webhook" | "none"): string {
  const rand = Math.random().toString(36).slice(2, 6);
  if (authType === "oauth") return `EAAG••••••••${rand}`;
  if (authType === "api_key") return `sk_••••••••${rand}`;
  if (authType === "webhook") return `whsec_••••••••${rand}`;
  return `svc_••••••••${rand}`;
}

function newFutureISO(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

export default IntegrationHubView;
