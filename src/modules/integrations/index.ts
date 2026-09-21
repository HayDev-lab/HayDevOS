/**
 * Integration Hub module — public barrel.
 *
 * Default export: IntegrationHubView (the Connect module view).
 */

export { IntegrationHubView } from "./IntegrationHubView";
export { default } from "./IntegrationHubView";

// Type re-exports for downstream consumers.
export type {
  ProviderCategory,
  AuthType,
  Provider,
  IntegrationStatus,
  HealthState,
  Integration,
  WebhookEndpoint,
  WebhookEventStatus,
  WebhookEvent,
  SyncRunStatus,
  SyncRun,
  CredentialType,
  Credential,
  IntegrationAuditAction,
  IntegrationAuditEntry,
  IntegrationSettings,
} from "./types";

// Data re-exports for convenience.
export {
  providers,
  integrations,
  webhookEndpoints,
  webhookEvents,
  syncRuns,
  credentials,
  integrationAudit,
  integrationSettings,
  statusBreakdown,
  syncSuccessSeries,
  eventsByProvider,
  avgDurationByProvider,
  credentialHealthBuckets,
  providerById,
  integrationById,
  endpointById,
  credentialById,
  credentialsExpiringSoon,
} from "./data";
