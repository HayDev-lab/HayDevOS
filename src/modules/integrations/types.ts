/**
 * HayDevOS Integration Hub — typed domain model.
 *
 * Philosophy: ONE credential vault, ONE webhook ingress, ONE audit trail,
 * ZERO plaintext exposure. Every provider (external + internal) is modelled
 * the same way so dashboards and automations can compose them uniformly.
 *
 * Security emphasis:
 *  - OAuth state + PKCE for OAuth providers.
 *  - HMAC-SHA256 signed webhooks with constant-time compare.
 *  - Server-only decryption (concept); UI never holds plaintext.
 *  - SSRF/private-network/metadata blocking on webhook egress.
 *  - Redirect URL validation allowlist.
 *  - Idempotency keys on every inbound event.
 */

import type { LucideIcon } from "lucide-react";
import type { MockIntegration } from "@/lib/mock/types";

// ─────────────────────────────────────────────────────────────────────────────
// Provider catalog
// ─────────────────────────────────────────────────────────────────────────────

export type ProviderCategory =
  | "social"
  | "messaging"
  | "email"
  | "webhook"
  | "internal";

export type AuthType = "oauth" | "api_key" | "webhook" | "none";

export interface Provider {
  /** Stable id, e.g. "meta", "telegram", "whatsapp", "signed_webhook". */
  id: string;
  /** Display name. */
  name: string;
  category: ProviderCategory;
  description: string;
  /** Lucide icon component reference. */
  icon: LucideIcon;
  /** What this provider can do for HayDevOS. */
  capabilities: string[];
  /** Authentication flow type. */
  authType: AuthType;
  /** Required OAuth scopes (when authType === "oauth"). */
  requiredScopes: string[];
  /** Documentation URL. */
  docsUrl: string;
  /** Accent token for cards/badges. */
  accent: "lime" | "cyan" | "amber" | "rose" | "violet";
}

// ─────────────────────────────────────────────────────────────────────────────
// Connected integration
// ─────────────────────────────────────────────────────────────────────────────

export type IntegrationStatus =
  | "connected"
  | "degraded"
  | "reauth_required"
  | "error"
  | "disconnected";

export type HealthState = "healthy" | "degraded" | "reauth" | "error" | "offline";

export interface Integration {
  id: string;
  orgId: string;
  /** FK to Provider.id. */
  providerId: string;
  /** Display name override (defaults to provider name). */
  label: string;
  status: IntegrationStatus;
  /** 0–100, derived from recent sync + webhook delivery health. */
  healthScore: number;
  authType: AuthType;
  /** Scopes actually granted (subset of provider.requiredScopes). */
  scopesGranted: string[];
  /** Capabilities in active use. */
  capabilitiesInUse: string[];
  /** Masked credential reference (e.g. "sk_live_••••••••42f1"). NEVER plaintext. */
  credentialRefMasked: string;
  /** FK to Credential.id. */
  credentialId: string;
  lastSyncAt: string | null;
  eventsProcessed: number;
  config: {
    /** Free-form masked config values. Always masked in UI. */
    [key: string]: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhooks
// ─────────────────────────────────────────────────────────────────────────────

export interface WebhookEndpoint {
  id: string;
  orgId: string;
  name: string;
  /** Ingress URL (the partner POSTs to this). */
  url: string;
  /** Masked signing secret (last 4 chars visible). */
  signingSecretMasked: string;
  /** Event types this endpoint will accept. */
  eventTypes: string[];
  /** FK to Provider.id (null for generic signed_webhook). */
  providerId: string | null;
  lastStatus: "delivered" | "failed" | "pending" | null;
  lastDeliveryAt: string | null;
  deliveries24h: number;
  successRate: number;
  /** HMAC verification status (always "verified" in mock — concept). */
  hmacVerified: boolean;
}

export type WebhookEventStatus = "delivered" | "failed" | "pending" | "replayed";

export interface WebhookEvent {
  id: string;
  orgId: string;
  endpointId: string;
  providerId: string | null;
  eventId: string;
  eventType: string;
  receivedAt: string;
  processedAt: string | null;
  status: WebhookEventStatus;
  /** HTTP response code from the downstream. */
  responseCode: number;
  /** HMAC verification result. */
  hmacValid: boolean;
  /** Bytes of the body — for the body-size limit enforcement. */
  bodyBytes: number;
  /** Idempotency key (deterministic from payload hash). */
  idempotencyKey: string;
  errorMessage: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync runs
// ─────────────────────────────────────────────────────────────────────────────

export type SyncRunStatus = "success" | "failed" | "running" | "partial";

export interface SyncRun {
  id: string;
  orgId: string;
  integrationId: string;
  providerId: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number;
  recordsIn: number;
  recordsOut: number;
  status: SyncRunStatus;
  error: string | null;
  /** Who/what triggered the run. */
  triggeredBy: "schedule" | "manual" | "webhook" | "backfill";
}

// ─────────────────────────────────────────────────────────────────────────────
// Credentials vault
// ─────────────────────────────────────────────────────────────────────────────

export type CredentialType =
  | "oauth_token"
  | "api_key"
  | "signing_secret"
  | "webhook_url"
  | "none";

export interface Credential {
  id: string;
  orgId: string;
  /** FK to Provider.id. */
  providerId: string;
  label: string;
  type: CredentialType;
  /** Masked representation (first 2 + last 4 chars visible). */
  maskedValue: string;
  /** Plaintext is NEVER exposed — the UI only ever shows `maskedValue`. */
  createdAt: string;
  lastRotatedAt: string;
  expiresAt: string | null;
  /** FK to Integration.id (optional — credentials may exist pre-connect). */
  integrationId: string | null;
  /** Encryption status (mock concept — always "encrypted_at_rest"). */
  encrypted: boolean;
  /** Whether this credential is the active one for its provider. */
  active: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit log (integration-scoped)
// ─────────────────────────────────────────────────────────────────────────────

export type IntegrationAuditAction =
  | "connect"
  | "disconnect"
  | "refresh_auth"
  | "rotate_credential"
  | "revoke_credential"
  | "test"
  | "sync"
  | "webhook_received"
  | "webhook_replayed"
  | "config_updated";

export interface IntegrationAuditEntry {
  id: string;
  orgId: string;
  actor: string;
  action: IntegrationAuditAction;
  providerId: string;
  integrationId: string | null;
  ip: string;
  userAgent: string;
  message: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Global settings
// ─────────────────────────────────────────────────────────────────────────────

export interface IntegrationSettings {
  webhookBaseUrl: string;
  /** Requests/min per provider. */
  rateLimitPerMin: number;
  /** Max inbound body size in KB. */
  maxBodySizeKb: number;
  /** Block SSRF / private networks / cloud metadata IPs on egress. */
  blockPrivateNetworks: boolean;
  /** Idempotency window in seconds for inbound events. */
  idempotencyWindowSec: number;
  /** Allowed redirect URL prefixes for OAuth flows. */
  redirectAllowlist: string[];
  /** Reject self-signed TLS certs on outbound calls. */
  rejectSelfSignedTls: boolean;
  /** Require HMAC verification on every inbound webhook. */
  requireHmac: boolean;
  /** Default sync schedule cron (for providers that support it). */
  defaultSyncCron: string;
  /** Auto-disable an integration after N consecutive failures. */
  autoDisableAfterFailures: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Status → accent token mapping for badges (matches spec). */
export const STATUS_ACCENT: Record<IntegrationStatus, "lime" | "amber" | "rose" | "cyan" | "violet"> = {
  connected: "lime",
  degraded: "amber",
  reauth_required: "amber",
  error: "rose",
  disconnected: "violet",
};

/** Re-export foundation mock type so consumers can import from one place. */
export type { MockIntegration };
