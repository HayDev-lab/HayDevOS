/**
 * Integration Hub catalog and empty organisation-scoped runtime collections.
 * Provider definitions are product metadata; connection records must come from
 * the server and are never pre-populated with fixtures.
 */
import {
  Boxes,
  Contact,
  CreditCard,
  Facebook,
  Instagram,
  FileText,
  Hash,
  Mail,
  MessageCircle,
  ScanLine,
  Slack,
  Target,
  Webhook,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { mockIntegrations } from "@/lib/mock/integrations";
import type {
  Credential,
  Integration,
  IntegrationAuditEntry,
  IntegrationSettings,
  Provider,
  ProviderCategory,
  AuthType,
  SyncRun,
  WebhookEndpoint,
  WebhookEvent,
} from "./types";

function defineProvider(
  id: string,
  name: string,
  category: ProviderCategory,
  description: string,
  icon: LucideIcon,
  authType: AuthType,
  accent: Provider["accent"],
  docsUrl: string,
  capabilities: string[],
  requiredScopes: string[] = [],
): Provider {
  return { id, name, category, description, icon, capabilities, authType, requiredScopes, docsUrl, accent };
}

export const providers: Provider[] = [
  defineProvider("facebook", "Facebook Pages", "social", "Facebook Page leads, Messenger conversations, publishing and conversions.", Facebook, "oauth", "cyan", "https://developers.facebook.com/docs/marketing-api", ["Lead capture", "Messenger inbox", "Page publishing", "Conversions API"], ["pages_show_list", "pages_read_engagement", "pages_manage_metadata", "pages_messaging", "leads_retrieval"]),
  defineProvider("instagram", "Instagram Professional", "social", "Instagram Professional comments, messages, media publishing and insights.", Instagram, "oauth", "rose", "https://developers.facebook.com/docs/instagram-api", ["Content publishing", "Comment moderation", "Messaging", "Insights"], ["instagram_basic", "instagram_content_publish", "instagram_manage_comments", "instagram_manage_messages"]),
  defineProvider("telegram", "Telegram", "messaging", "Bot messages, notifications, and two-way conversations.", MessageCircle, "api_key", "cyan", "https://core.telegram.org/bots/api", ["Bot inbox", "Push notifications", "Channel broadcast"]),
  defineProvider("whatsapp", "WhatsApp Business", "messaging", "Business messages, templates, media, and delivery receipts.", Hash, "oauth", "lime", "https://developers.facebook.com/docs/whatsapp", ["Template messages", "Session messages", "Media exchange", "Webhook receipts"]),
  defineProvider("email", "Email (SMTP/IMAP)", "email", "Outbound email and inbound mailbox processing.", Mail, "api_key", "amber", "https://datatracker.ietf.org/doc/html/rfc3501", ["Outbound SMTP", "Inbound IMAP", "Template rendering"]),
  defineProvider("signed_webhook", "Signed Webhook", "webhook", "HMAC-SHA256 signed webhook ingress for custom providers.", Webhook, "webhook", "violet", "https://haydevos.com/docs/webhooks", ["HMAC verification", "Idempotent ingress", "Event replay"]),
  defineProvider("erp", "ERP Hub", "internal", "Customers, orders, invoices, payments, and inventory.", Boxes, "none", "lime", "https://haydevos.com/docs/erp", ["Customer sync", "Order events", "Invoice events"]),
  defineProvider("leados", "LeadOS", "internal", "Leads, pipeline stages, owners, activities, and SLA events.", Target, "none", "lime", "https://haydevos.com/docs/leados", ["Lead events", "Pipeline updates", "SLA alerts"]),
  defineProvider("quoteflow", "QuoteFlow", "internal", "Quotes, versions, approvals, and signatures.", FileText, "none", "cyan", "https://haydevos.com/docs/quoteflow", ["Quote events", "Approval events", "Signature events"]),
  defineProvider("documentflow", "DocumentFlow", "internal", "Document intake, extraction, review, and exports.", ScanLine, "none", "amber", "https://haydevos.com/docs/documentflow", ["Document intake", "Extraction events", "Review events"]),
  defineProvider("automation", "Automation Builder", "internal", "Workflow triggers, actions, approvals, and run events.", Workflow, "none", "violet", "https://haydevos.com/docs/autopilot", ["Workflow triggers", "Run events", "Approvals"]),
  defineProvider("slack", "Slack", "messaging", "Workspace notifications and interactive messages.", Slack, "oauth", "violet", "https://api.slack.com/docs", ["Channel messages", "Direct messages", "Interactive actions"]),
  defineProvider("hubspot", "HubSpot", "internal", "CRM contacts, companies, deals, and activity sync.", Contact, "oauth", "amber", "https://developers.hubspot.com/docs", ["Contact sync", "Deal sync", "Activity sync"]),
  defineProvider("stripe", "Stripe", "internal", "Payments, refunds, invoices, and signed events.", CreditCard, "oauth", "violet", "https://stripe.com/docs/api", ["Payments", "Refunds", "Invoice events", "Signed webhooks"]),
];

export function providerById(id: string): Provider | undefined {
  return providers.find((provider) => provider.id === id);
}

export const integrations: Integration[] = [];
export const webhookEndpoints: WebhookEndpoint[] = [];
export const webhookEvents: WebhookEvent[] = [];
export const syncRuns: SyncRun[] = [];
export const credentials: Credential[] = [];
export const integrationAudit: IntegrationAuditEntry[] = [];

export function integrationById(id: string): Integration | undefined {
  return integrations.find((integration) => integration.id === id);
}

export function endpointById(id: string): WebhookEndpoint | undefined {
  return webhookEndpoints.find((endpoint) => endpoint.id === id);
}

export function credentialById(id: string): Credential | undefined {
  return credentials.find((credential) => credential.id === id);
}

export function credentialsExpiringSoon(): Credential[] {
  return [];
}

export const integrationSettings: IntegrationSettings = {
  webhookBaseUrl: "https://haydevos.com/api/integrations/webhooks",
  rateLimitPerMin: 600,
  maxBodySizeKb: 512,
  blockPrivateNetworks: true,
  idempotencyWindowSec: 3600,
  redirectAllowlist: ["https://haydevos.com/api/integrations/oauth/callback"],
  rejectSelfSignedTls: true,
  requireHmac: true,
  defaultSyncCron: "*/15 * * * *",
  autoDisableAfterFailures: 5,
};

export const statusBreakdown: { status: string; count: number }[] = [];
export const syncSuccessSeries: { day: string; success: number; failed: number; partial: number }[] = [];
export const eventsByProvider: { provider: string; events: number }[] = [];
export const avgDurationByProvider: { provider: string; ms: number }[] = [];
export const credentialHealthBuckets: { bucket: string; count: number }[] = [];

export { mockIntegrations };
