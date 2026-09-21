/**
 * HayDevOS Integration Hub — in-memory data layer.
 *
 * Re-exports the foundation `mockIntegrations` (8 records) for back-compat,
 * and adds the canonical Integration Hub datasets: a 13-provider catalog,
 * typed connected integrations, webhook endpoints + events, sync runs,
 * credential vault metadata, an integration audit log, global settings,
 * and analytics rollups.
 *
 * All credential values are MASKED — no plaintext is ever stored here.
 * The "decryption" concept is server-only (see IntegrationDetail reveal).
 */

import {
  Facebook,
  MessageCircle,
  Hash,
  Mail,
  Webhook,
  Boxes,
  Target,
  FileText,
  ScanLine,
  Workflow,
  Slack,
  Contact,
  CreditCard,
} from "lucide-react";

import { mockIntegrations } from "@/lib/mock/integrations";
import type {
  Provider,
  Integration,
  WebhookEndpoint,
  WebhookEvent,
  SyncRun,
  Credential,
  IntegrationAuditEntry,
  IntegrationSettings,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ORG = "org_haydev";
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3600000).toISOString();
const minsAgo = (m: number) => new Date(now - m * 60000).toISOString();
const daysAhead = (d: number) => new Date(now + d * 86400000).toISOString();

// ─────────────────────────────────────────────────────────────────────────────
// Provider catalog — 13 providers covering external + HayDevOS internals
// ─────────────────────────────────────────────────────────────────────────────

export const providers: Provider[] = [
  {
    id: "meta",
    name: "Meta",
    category: "social",
    description:
      "Facebook & Instagram Lead Ads, Messenger, marketing audiences. OAuth 2.0 with PKCE.",
    icon: Facebook,
    capabilities: ["Lead capture", "Messenger inbox", "Audience sync", "Conversions API"],
    authType: "oauth",
    requiredScopes: [
      "pages_show_list",
      "pages_messaging",
      "leads_retrieval",
      "ads_management",
      "business_management",
    ],
    docsUrl: "https://developers.facebook.com/docs/marketing-api",
    accent: "cyan",
  },
  {
    id: "telegram",
    name: "Telegram",
    category: "messaging",
    description:
      "Bot API for inbound lead intake, notifications, and 2-way conversations. Bot token auth.",
    icon: MessageCircle,
    capabilities: ["Bot inbox", "Push notifications", "Channel broadcast", "Inline keyboards"],
    authType: "api_key",
    requiredScopes: [],
    docsUrl: "https://core.telegram.org/bots/api",
    accent: "cyan",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "messaging",
    description:
      "Cloud API for templates, session messages, and customer support flows. OAuth + phone number ID.",
    icon: Hash,
    capabilities: ["Template messages", "Session messages", "Media exchange", "Webhook receipts"],
    authType: "oauth",
    requiredScopes: [
      "whatsapp_business_messaging",
      "whatsapp_business_management",
    ],
    docsUrl: "https://developers.facebook.com/docs/whatsapp",
    accent: "lime",
  },
  {
    id: "email",
    name: "Email (SMTP/IMAP)",
    category: "email",
    description:
      "Universal email integration for outbound sequences and inbound parsing. App password / OAuth.",
    icon: Mail,
    capabilities: ["Outbound SMTP", "Inbound IMAP", "Template rendering", "Bounce handling"],
    authType: "api_key",
    requiredScopes: [],
    docsUrl: "https://datatracker.ietf.org/doc/html/rfc3501",
    accent: "amber",
  },
  {
    id: "signed_webhook",
    name: "Signed Webhook",
    category: "webhook",
    description:
      "Generic HMAC-SHA256 signed webhook ingress. Bring your own provider — we verify the signature.",
    icon: Webhook,
    capabilities: ["HMAC verification", "Idempotent ingress", "Event replay", "Custom event types"],
    authType: "webhook",
    requiredScopes: [],
    docsUrl: "https://docs.haydev.os/webhooks",
    accent: "violet",
  },
  {
    id: "erp",
    name: "ERP Hub",
    category: "internal",
    description:
      "HayDevOS ERP — customers, orders, invoices, payments. No external auth (org-scoped service token).",
    icon: Boxes,
    capabilities: ["Customer sync", "Order webhooks", "Invoice webhooks", "Payment hooks"],
    authType: "none",
    requiredScopes: [],
    docsUrl: "https://docs.haydev.os/erp",
    accent: "lime",
  },
  {
    id: "leados",
    name: "LeadOS",
    category: "internal",
    description:
      "HayDevOS lead-to-cash pipeline. Emits lead stage transitions + SLA breach events.",
    icon: Target,
    capabilities: ["Lead events", "Stage transitions", "SLA breach signals", "Owner routing"],
    authType: "none",
    requiredScopes: [],
    docsUrl: "https://docs.haydev.os/leados",
    accent: "lime",
  },
  {
    id: "quoteflow",
    name: "QuoteFlow",
    category: "internal",
    description:
      "HayDevOS quoting engine. Emits quote sent/accepted/rejected events for downstream billing.",
    icon: FileText,
    capabilities: ["Quote events", "Approval hooks", "E-sign callbacks", "Version pinning"],
    authType: "none",
    requiredScopes: [],
    docsUrl: "https://docs.haydev.os/quoteflow",
    accent: "cyan",
  },
  {
    id: "documentflow",
    name: "DocumentFlow",
    category: "internal",
    description:
      "HayDevOS document AI. Emits classified/extracted/approved events with confidence scores.",
    icon: ScanLine,
    capabilities: ["Document events", "Extraction results", "Review queue hooks", "Batch signals"],
    authType: "none",
    requiredScopes: [],
    docsUrl: "https://docs.haydev.os/documentflow",
    accent: "amber",
  },
  {
    id: "automation",
    name: "Automation Builder",
    category: "internal",
    description:
      "HayDevOS Autopilot — emits automation started/succeeded/failed + approval-decision events.",
    icon: Workflow,
    capabilities: ["Run events", "Approval hooks", "Failure alerts", "Schedule ticks"],
    authType: "none",
    requiredScopes: [],
    docsUrl: "https://docs.haydev.os/autopilot",
    accent: "violet",
  },
  {
    id: "slack",
    name: "Slack",
    category: "messaging",
    description:
      "Slack workspace integration for notifications, slash commands, and approval DMs. OAuth 2.0.",
    icon: Slack,
    capabilities: ["Channel notifications", "Slash commands", "DM approvals", "Thread replies"],
    authType: "oauth",
    requiredScopes: [
      "channels:read",
      "chat:write",
      "commands",
      "users:read",
      "users.profile:read",
    ],
    docsUrl: "https://api.slack.com/docs",
    accent: "violet",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "internal",
    description:
      "HubSpot CRM sync — contacts, deals, companies. Bi-directional sync with conflict resolution.",
    icon: Contact,
    capabilities: ["Contact sync", "Deal sync", "Company sync", "Timeline events"],
    authType: "oauth",
    requiredScopes: [
      "crm.objects.contacts.read",
      "crm.objects.contacts.write",
      "crm.objects.deals.read",
      "crm.objects.deals.write",
    ],
    docsUrl: "https://developers.hubspot.com/docs",
    accent: "amber",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "internal",
    description:
      "Stripe billing & payments — subscription webhooks, payment intents, customer portal. OAuth.",
    icon: CreditCard,
    capabilities: ["Payment webhooks", "Subscription sync", "Customer sync", "Invoice events"],
    authType: "oauth",
    requiredScopes: [
      "read_only",
      "payments",
      "subscriptions",
      "invoices",
    ],
    docsUrl: "https://stripe.com/docs/api",
    accent: "violet",
  },
];

export function providerById(id: string): Provider | undefined {
  return providers.find((p) => p.id === id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Connected integrations (10 — covers every status)
// ─────────────────────────────────────────────────────────────────────────────

export const integrations: Integration[] = [
  {
    id: "int_001",
    orgId: ORG,
    providerId: "meta",
    label: "Meta — HayDev HQ",
    status: "error",
    healthScore: 22,
    authType: "oauth",
    scopesGranted: ["pages_show_list", "leads_retrieval", "ads_management"],
    capabilitiesInUse: ["Lead capture", "Conversions API"],
    credentialRefMasked: "EAAG••••••••4f1a",
    credentialId: "cr_001",
    lastSyncAt: daysAgo(1),
    eventsProcessed: 921,
    config: {
      pageId: "10294••••21",
      pixelId: "88472••••93",
      businessId: "biz_••••••6c4",
    },
    createdAt: daysAgo(20),
    updatedAt: daysAgo(1),
  },
  {
    id: "int_002",
    orgId: ORG,
    providerId: "telegram",
    label: "Telegram — Sales Bot",
    status: "connected",
    healthScore: 98,
    authType: "api_key",
    scopesGranted: [],
    capabilitiesInUse: ["Bot inbox", "Push notifications"],
    credentialRefMasked: "8421••••••••AAHb",
    credentialId: "cr_002",
    lastSyncAt: minsAgo(3),
    eventsProcessed: 18429,
    config: {
      botHandle: "@haydev_sales_bot",
      chatId: "-1001••••4421",
    },
    createdAt: daysAgo(90),
    updatedAt: hoursAgo(2),
  },
  {
    id: "int_003",
    orgId: ORG,
    providerId: "whatsapp",
    label: "WhatsApp — Support Line",
    status: "connected",
    healthScore: 94,
    authType: "oauth",
    scopesGranted: ["whatsapp_business_messaging", "whatsapp_business_management"],
    capabilitiesInUse: ["Template messages", "Session messages", "Webhook receipts"],
    credentialRefMasked: "EAAJ••••••••902c",
    credentialId: "cr_003",
    lastSyncAt: minsAgo(8),
    eventsProcessed: 7341,
    config: {
      phoneNumberId: "1098••••44",
      wabaId: "2094••••11",
      businessName: "HayDev HQ",
    },
    createdAt: daysAgo(45),
    updatedAt: hoursAgo(1),
  },
  {
    id: "int_004",
    orgId: ORG,
    providerId: "email",
    label: "Email — outbound@haydev.os",
    status: "degraded",
    healthScore: 64,
    authType: "api_key",
    scopesGranted: [],
    capabilitiesInUse: ["Outbound SMTP", "Inbound IMAP", "Bounce handling"],
    credentialRefMasked: "ap_••••••••f2c8",
    credentialId: "cr_004",
    lastSyncAt: hoursAgo(6),
    eventsProcessed: 5210,
    config: {
      smtpHost: "smtp.••••.com",
      imapHost: "imap.••••.com",
      mailbox: "outbound@••••.os",
    },
    createdAt: daysAgo(45),
    updatedAt: hoursAgo(6),
  },
  {
    id: "int_005",
    orgId: ORG,
    providerId: "signed_webhook",
    label: "Signed Webhook — Ingress",
    status: "connected",
    healthScore: 99,
    authType: "webhook",
    scopesGranted: [],
    capabilitiesInUse: ["HMAC verification", "Idempotent ingress", "Event replay"],
    credentialRefMasked: "whsec_••••••••9a42",
    credentialId: "cr_005",
    lastSyncAt: minsAgo(1),
    eventsProcessed: 22018,
    config: {
      endpoint: "/hooks/ingress",
      algorithm: "HMAC-SHA256",
    },
    createdAt: daysAgo(120),
    updatedAt: minsAgo(1),
  },
  {
    id: "int_006",
    orgId: ORG,
    providerId: "stripe",
    label: "Stripe — Live Production",
    status: "reauth_required",
    healthScore: 38,
    authType: "oauth",
    scopesGranted: ["read_only", "payments", "invoices"],
    capabilitiesInUse: ["Payment webhooks", "Subscription sync", "Invoice events"],
    credentialRefMasked: "sk_live_••••••••42f1",
    credentialId: "cr_006",
    lastSyncAt: daysAgo(3),
    eventsProcessed: 1842,
    config: {
      accountId: "acct_1••••4f2",
      mode: "live",
      webhookId: "we_1••••4f2",
    },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(3),
  },
  {
    id: "int_007",
    orgId: ORG,
    providerId: "slack",
    label: "Slack — HayDev Workspace",
    status: "connected",
    healthScore: 96,
    authType: "oauth",
    scopesGranted: ["channels:read", "chat:write", "commands", "users:read"],
    capabilitiesInUse: ["Channel notifications", "DM approvals", "Thread replies"],
    credentialRefMasked: "xoxb-••••••••fa2",
    credentialId: "cr_007",
    lastSyncAt: minsAgo(11),
    eventsProcessed: 14021,
    config: {
      teamId: "T1••••2A",
      defaultChannel: "C0••••4F",
      appName: "HayDevOS",
    },
    createdAt: daysAgo(75),
    updatedAt: hoursAgo(2),
  },
  {
    id: "int_008",
    orgId: ORG,
    providerId: "hubspot",
    label: "HubSpot — CRM Sync",
    status: "connected",
    healthScore: 91,
    authType: "oauth",
    scopesGranted: [
      "crm.objects.contacts.read",
      "crm.objects.contacts.write",
      "crm.objects.deals.read",
    ],
    capabilitiesInUse: ["Contact sync", "Deal sync", "Timeline events"],
    credentialRefMasked: "pat-••••••••8c4",
    credentialId: "cr_008",
    lastSyncAt: hoursAgo(1),
    eventsProcessed: 9412,
    config: {
      portalId: "2018••••4",
      syncDirection: "bi-directional",
      conflictPolicy: "last-write-wins",
    },
    createdAt: daysAgo(60),
    updatedAt: hoursAgo(1),
  },
  {
    id: "int_009",
    orgId: ORG,
    providerId: "leados",
    label: "LeadOS — Internal",
    status: "connected",
    healthScore: 100,
    authType: "none",
    scopesGranted: [],
    capabilitiesInUse: ["Lead events", "Stage transitions", "SLA breach signals"],
    credentialRefMasked: "svc_••••••••1a2b",
    credentialId: "cr_009",
    lastSyncAt: minsAgo(1),
    eventsProcessed: 31204,
    config: {
      serviceToken: "svc_••••••••1a2b",
      emitLeadEvents: "true",
    },
    createdAt: daysAgo(180),
    updatedAt: minsAgo(1),
  },
  {
    id: "int_010",
    orgId: ORG,
    providerId: "erp",
    label: "ERP Hub — Internal",
    status: "connected",
    healthScore: 100,
    authType: "none",
    scopesGranted: [],
    capabilitiesInUse: ["Customer sync", "Order webhooks", "Invoice webhooks"],
    credentialRefMasked: "svc_••••••••3c4d",
    credentialId: "cr_010",
    lastSyncAt: minsAgo(1),
    eventsProcessed: 28102,
    config: {
      serviceToken: "svc_••••••••3c4d",
      emitPaymentHooks: "true",
    },
    createdAt: daysAgo(180),
    updatedAt: minsAgo(1),
  },
];

export function integrationById(id: string): Integration | undefined {
  return integrations.find((i) => i.id === id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook endpoints (6)
// ─────────────────────────────────────────────────────────────────────────────

export const webhookEndpoints: WebhookEndpoint[] = [
  {
    id: "wh_001",
    orgId: ORG,
    name: "Generic Signed Ingress",
    url: "https://api.haydev.os/hooks/ingress/wh_001",
    signingSecretMasked: "whsec_••••••••9a42",
    eventTypes: ["lead.created", "quote.accepted", "invoice.paid", "doc.approved"],
    providerId: "signed_webhook",
    lastStatus: "delivered",
    lastDeliveryAt: minsAgo(2),
    deliveries24h: 4218,
    successRate: 99.6,
    hmacVerified: true,
  },
  {
    id: "wh_002",
    orgId: ORG,
    name: "Stripe → HayDevOS",
    url: "https://api.haydev.os/hooks/stripe/wh_002",
    signingSecretMasked: "whsec_••••••••5e1",
    eventTypes: ["payment_intent.succeeded", "invoice.paid", "customer.updated"],
    providerId: "stripe",
    lastStatus: "delivered",
    lastDeliveryAt: minsAgo(8),
    deliveries24h: 1421,
    successRate: 99.2,
    hmacVerified: true,
  },
  {
    id: "wh_003",
    orgId: ORG,
    name: "Meta Lead Ads",
    url: "https://api.haydev.os/hooks/meta/wh_003",
    signingSecretMasked: "whsec_••••••••7f2",
    eventTypes: ["leadgen"],
    providerId: "meta",
    lastStatus: "failed",
    lastDeliveryAt: hoursAgo(3),
    deliveries24h: 42,
    successRate: 76.4,
    hmacVerified: true,
  },
  {
    id: "wh_004",
    orgId: ORG,
    name: "WhatsApp Inbound",
    url: "https://api.haydev.os/hooks/whatsapp/wh_004",
    signingSecretMasked: "whsec_••••••••3a8",
    eventTypes: ["messages", "message_status", "template_status"],
    providerId: "whatsapp",
    lastStatus: "delivered",
    lastDeliveryAt: minsAgo(4),
    deliveries24h: 821,
    successRate: 98.9,
    hmacVerified: true,
  },
  {
    id: "wh_005",
    orgId: ORG,
    name: "Slack Slash + Interactivity",
    url: "https://api.haydev.os/hooks/slack/wh_005",
    signingSecretMasked: "whsec_••••••••6b9",
    eventTypes: ["slash_command", "interactive", "event_callback"],
    providerId: "slack",
    lastStatus: "delivered",
    lastDeliveryAt: minsAgo(15),
    deliveries24h: 312,
    successRate: 99.8,
    hmacVerified: true,
  },
  {
    id: "wh_006",
    orgId: ORG,
    name: "HubSpot CRM Events",
    url: "https://api.haydev.os/hooks/hubspot/wh_006",
    signingSecretMasked: "whsec_••••••••2d4",
    eventTypes: ["contact.creation", "deal.propertyChange", "ticket.creation"],
    providerId: "hubspot",
    lastStatus: "pending",
    lastDeliveryAt: hoursAgo(2),
    deliveries24h: 198,
    successRate: 97.4,
    hmacVerified: true,
  },
];

export function endpointById(id: string): WebhookEndpoint | undefined {
  return webhookEndpoints.find((w) => w.id === id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook events (recent 18)
// ─────────────────────────────────────────────────────────────────────────────

export const webhookEvents: WebhookEvent[] = [
  {
    id: "ev_001", orgId: ORG, endpointId: "wh_001", providerId: "signed_webhook",
    eventId: "evt_9f2a4c1", eventType: "lead.created",
    receivedAt: minsAgo(2), processedAt: minsAgo(2), status: "delivered",
    responseCode: 200, hmacValid: true, bodyBytes: 1842,
    idempotencyKey: "idem_8f4a2c1", errorMessage: null,
  },
  {
    id: "ev_002", orgId: ORG, endpointId: "wh_002", providerId: "stripe",
    eventId: "evt_1Na2bc3", eventType: "payment_intent.succeeded",
    receivedAt: minsAgo(8), processedAt: minsAgo(8), status: "delivered",
    responseCode: 200, hmacValid: true, bodyBytes: 2941,
    idempotencyKey: "idem_2Na2bc3", errorMessage: null,
  },
  {
    id: "ev_003", orgId: ORG, endpointId: "wh_003", providerId: "meta",
    eventId: "evt_meta_441", eventType: "leadgen",
    receivedAt: hoursAgo(3), processedAt: null, status: "failed",
    responseCode: 503, hmacValid: true, bodyBytes: 1024,
    idempotencyKey: "idem_meta441", errorMessage: "Downstream timeout after 5000ms",
  },
  {
    id: "ev_004", orgId: ORG, endpointId: "wh_004", providerId: "whatsapp",
    eventId: "evt_wa_821", eventType: "messages",
    receivedAt: minsAgo(4), processedAt: minsAgo(4), status: "delivered",
    responseCode: 200, hmacValid: true, bodyBytes: 921,
    idempotencyKey: "idem_wa821", errorMessage: null,
  },
  {
    id: "ev_005", orgId: ORG, endpointId: "wh_001", providerId: "signed_webhook",
    eventId: "evt_9f2a4c2", eventType: "quote.accepted",
    receivedAt: minsAgo(12), processedAt: minsAgo(12), status: "delivered",
    responseCode: 200, hmacValid: true, bodyBytes: 1412,
    idempotencyKey: "idem_8f4a2c2", errorMessage: null,
  },
  {
    id: "ev_006", orgId: ORG, endpointId: "wh_005", providerId: "slack",
    eventId: "evt_slack_91", eventType: "slash_command",
    receivedAt: minsAgo(15), processedAt: minsAgo(15), status: "delivered",
    responseCode: 200, hmacValid: true, bodyBytes: 612,
    idempotencyKey: "idem_slack91", errorMessage: null,
  },
  {
    id: "ev_007", orgId: ORG, endpointId: "wh_006", providerId: "hubspot",
    eventId: "evt_hs_22", eventType: "contact.creation",
    receivedAt: hoursAgo(2), processedAt: null, status: "pending",
    responseCode: 202, hmacValid: true, bodyBytes: 1521,
    idempotencyKey: "idem_hs22", errorMessage: null,
  },
  {
    id: "ev_008", orgId: ORG, endpointId: "wh_002", providerId: "stripe",
    eventId: "evt_1Na2bc4", eventType: "invoice.paid",
    receivedAt: minsAgo(22), processedAt: minsAgo(22), status: "delivered",
    responseCode: 200, hmacValid: true, bodyBytes: 1812,
    idempotencyKey: "idem_2Na2bc4", errorMessage: null,
  },
  {
    id: "ev_009", orgId: ORG, endpointId: "wh_001", providerId: "signed_webhook",
    eventId: "evt_9f2a4c3", eventType: "invoice.paid",
    receivedAt: minsAgo(31), processedAt: minsAgo(31), status: "replayed",
    responseCode: 200, hmacValid: true, bodyBytes: 1102,
    idempotencyKey: "idem_8f4a2c3", errorMessage: null,
  },
  {
    id: "ev_010", orgId: ORG, endpointId: "wh_004", providerId: "whatsapp",
    eventId: "evt_wa_822", eventType: "message_status",
    receivedAt: minsAgo(45), processedAt: minsAgo(45), status: "delivered",
    responseCode: 200, hmacValid: true, bodyBytes: 412,
    idempotencyKey: "idem_wa822", errorMessage: null,
  },
  {
    id: "ev_011", orgId: ORG, endpointId: "wh_005", providerId: "slack",
    eventId: "evt_slack_92", eventType: "interactive",
    receivedAt: minsAgo(58), processedAt: minsAgo(58), status: "delivered",
    responseCode: 200, hmacValid: true, bodyBytes: 821,
    idempotencyKey: "idem_slack92", errorMessage: null,
  },
  {
    id: "ev_012", orgId: ORG, endpointId: "wh_003", providerId: "meta",
    eventId: "evt_meta_442", eventType: "leadgen",
    receivedAt: hoursAgo(5), processedAt: hoursAgo(5), status: "delivered",
    responseCode: 200, hmacValid: true, bodyBytes: 992,
    idempotencyKey: "idem_meta442", errorMessage: null,
  },
  {
    id: "ev_013", orgId: ORG, endpointId: "wh_001", providerId: "signed_webhook",
    eventId: "evt_9f2a4c4", eventType: "doc.approved",
    receivedAt: hoursAgo(1), processedAt: hoursAgo(1), status: "delivered",
    responseCode: 200, hmacValid: true, bodyBytes: 712,
    idempotencyKey: "idem_8f4a2c4", errorMessage: null,
  },
  {
    id: "ev_014", orgId: ORG, endpointId: "wh_002", providerId: "stripe",
    eventId: "evt_1Na2bc5", eventType: "customer.updated",
    receivedAt: hoursAgo(2), processedAt: hoursAgo(2), status: "delivered",
    responseCode: 200, hmacValid: true, bodyBytes: 1241,
    idempotencyKey: "idem_2Na2bc5", errorMessage: null,
  },
  {
    id: "ev_015", orgId: ORG, endpointId: "wh_004", providerId: "whatsapp",
    eventId: "evt_wa_823", eventType: "template_status",
    receivedAt: hoursAgo(3), processedAt: null, status: "failed",
    responseCode: 422, hmacValid: true, bodyBytes: 612,
    idempotencyKey: "idem_wa823", errorMessage: "Template rejected by WhatsApp review",
  },
  {
    id: "ev_016", orgId: ORG, endpointId: "wh_006", providerId: "hubspot",
    eventId: "evt_hs_23", eventType: "deal.propertyChange",
    receivedAt: hoursAgo(4), processedAt: hoursAgo(4), status: "delivered",
    responseCode: 200, hmacValid: true, bodyBytes: 1321,
    idempotencyKey: "idem_hs23", errorMessage: null,
  },
  {
    id: "ev_017", orgId: ORG, endpointId: "wh_005", providerId: "slack",
    eventId: "evt_slack_93", eventType: "event_callback",
    receivedAt: hoursAgo(6), processedAt: hoursAgo(6), status: "delivered",
    responseCode: 200, hmacValid: true, bodyBytes: 521,
    idempotencyKey: "idem_slack93", errorMessage: null,
  },
  {
    id: "ev_018", orgId: ORG, endpointId: "wh_001", providerId: "signed_webhook",
    eventId: "evt_9f2a4c5", eventType: "lead.created",
    receivedAt: hoursAgo(7), processedAt: hoursAgo(7), status: "delivered",
    responseCode: 200, hmacValid: true, bodyBytes: 1732,
    idempotencyKey: "idem_8f4a2c5", errorMessage: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sync runs (14)
// ─────────────────────────────────────────────────────────────────────────────

export const syncRuns: SyncRun[] = [
  {
    id: "sr_001", orgId: ORG, integrationId: "int_002", providerId: "telegram",
    startedAt: minsAgo(3), finishedAt: minsAgo(3), durationMs: 412,
    recordsIn: 21, recordsOut: 21, status: "success",
    error: null, triggeredBy: "schedule",
  },
  {
    id: "sr_002", orgId: ORG, integrationId: "int_003", providerId: "whatsapp",
    startedAt: minsAgo(8), finishedAt: minsAgo(8), durationMs: 1821,
    recordsIn: 184, recordsOut: 184, status: "success",
    error: null, triggeredBy: "webhook",
  },
  {
    id: "sr_003", orgId: ORG, integrationId: "int_005", providerId: "signed_webhook",
    startedAt: minsAgo(2), finishedAt: minsAgo(2), durationMs: 142,
    recordsIn: 4, recordsOut: 4, status: "success",
    error: null, triggeredBy: "webhook",
  },
  {
    id: "sr_004", orgId: ORG, integrationId: "int_007", providerId: "slack",
    startedAt: minsAgo(11), finishedAt: minsAgo(11), durationMs: 612,
    recordsIn: 41, recordsOut: 41, status: "success",
    error: null, triggeredBy: "schedule",
  },
  {
    id: "sr_005", orgId: ORG, integrationId: "int_008", providerId: "hubspot",
    startedAt: hoursAgo(1), finishedAt: hoursAgo(1), durationMs: 4821,
    recordsIn: 412, recordsOut: 408, status: "partial",
    error: "4 records skipped due to conflict; see conflict log",
    triggeredBy: "schedule",
  },
  {
    id: "sr_006", orgId: ORG, integrationId: "int_004", providerId: "email",
    startedAt: hoursAgo(6), finishedAt: hoursAgo(6), durationMs: 12041,
    recordsIn: 312, recordsOut: 0, status: "failed",
    error: "IMAP auth rejected: invalid app password",
    triggeredBy: "schedule",
  },
  {
    id: "sr_007", orgId: ORG, integrationId: "int_001", providerId: "meta",
    startedAt: daysAgo(1), finishedAt: daysAgo(1), durationMs: 9412,
    recordsIn: 21, recordsOut: 0, status: "failed",
    error: "OAuth token expired; refresh failed (reauth required)",
    triggeredBy: "schedule",
  },
  {
    id: "sr_008", orgId: ORG, integrationId: "int_006", providerId: "stripe",
    startedAt: daysAgo(3), finishedAt: daysAgo(3), durationMs: 2241,
    recordsIn: 88, recordsOut: 0, status: "failed",
    error: "Stripe API key revoked",
    triggeredBy: "schedule",
  },
  {
    id: "sr_009", orgId: ORG, integrationId: "int_009", providerId: "leados",
    startedAt: minsAgo(1), finishedAt: minsAgo(1), durationMs: 92,
    recordsIn: 8, recordsOut: 8, status: "success",
    error: null, triggeredBy: "webhook",
  },
  {
    id: "sr_010", orgId: ORG, integrationId: "int_010", providerId: "erp",
    startedAt: minsAgo(1), finishedAt: minsAgo(1), durationMs: 142,
    recordsIn: 12, recordsOut: 12, status: "success",
    error: null, triggeredBy: "webhook",
  },
  {
    id: "sr_011", orgId: ORG, integrationId: "int_002", providerId: "telegram",
    startedAt: hoursAgo(2), finishedAt: hoursAgo(2), durationMs: 382,
    recordsIn: 18, recordsOut: 18, status: "success",
    error: null, triggeredBy: "schedule",
  },
  {
    id: "sr_012", orgId: ORG, integrationId: "int_007", providerId: "slack",
    startedAt: hoursAgo(3), finishedAt: hoursAgo(3), durationMs: 521,
    recordsIn: 32, recordsOut: 32, status: "success",
    error: null, triggeredBy: "manual",
  },
  {
    id: "sr_013", orgId: ORG, integrationId: "int_008", providerId: "hubspot",
    startedAt: hoursAgo(5), finishedAt: hoursAgo(5), durationMs: 3921,
    recordsIn: 381, recordsOut: 381, status: "success",
    error: null, triggeredBy: "schedule",
  },
  {
    id: "sr_014", orgId: ORG, integrationId: "int_003", providerId: "whatsapp",
    startedAt: hoursAgo(7), finishedAt: hoursAgo(7), durationMs: 1821,
    recordsIn: 142, recordsOut: 142, status: "success",
    error: null, triggeredBy: "backfill",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Credentials vault (10 — masked)
// ─────────────────────────────────────────────────────────────────────────────

export const credentials: Credential[] = [
  {
    id: "cr_001", orgId: ORG, providerId: "meta", label: "Meta — Page Access Token",
    type: "oauth_token", maskedValue: "EAAG••••••••4f1a",
    createdAt: daysAgo(20), lastRotatedAt: daysAgo(20), expiresAt: daysAhead(8),
    integrationId: "int_001", encrypted: true, active: true,
  },
  {
    id: "cr_002", orgId: ORG, providerId: "telegram", label: "Telegram — Bot Token",
    type: "api_key", maskedValue: "8421••••••••AAHb",
    createdAt: daysAgo(90), lastRotatedAt: daysAgo(30), expiresAt: null,
    integrationId: "int_002", encrypted: true, active: true,
  },
  {
    id: "cr_003", orgId: ORG, providerId: "whatsapp", label: "WhatsApp — System User Token",
    type: "oauth_token", maskedValue: "EAAJ••••••••902c",
    createdAt: daysAgo(45), lastRotatedAt: daysAgo(15), expiresAt: daysAhead(45),
    integrationId: "int_003", encrypted: true, active: true,
  },
  {
    id: "cr_004", orgId: ORG, providerId: "email", label: "Email — SMTP App Password",
    type: "api_key", maskedValue: "ap_••••••••f2c8",
    createdAt: daysAgo(45), lastRotatedAt: daysAgo(45), expiresAt: null,
    integrationId: "int_004", encrypted: true, active: true,
  },
  {
    id: "cr_005", orgId: ORG, providerId: "signed_webhook", label: "Signed Webhook — Secret",
    type: "signing_secret", maskedValue: "whsec_••••••••9a42",
    createdAt: daysAgo(120), lastRotatedAt: daysAgo(7), expiresAt: null,
    integrationId: "int_005", encrypted: true, active: true,
  },
  {
    id: "cr_006", orgId: ORG, providerId: "stripe", label: "Stripe — Restricted Key",
    type: "oauth_token", maskedValue: "sk_live_••••••••42f1",
    createdAt: daysAgo(30), lastRotatedAt: daysAgo(3), expiresAt: daysAhead(2),
    integrationId: "int_006", encrypted: true, active: false,
  },
  {
    id: "cr_007", orgId: ORG, providerId: "slack", label: "Slack — Bot OAuth Token",
    type: "oauth_token", maskedValue: "xoxb-••••••••fa2",
    createdAt: daysAgo(75), lastRotatedAt: daysAgo(20), expiresAt: null,
    integrationId: "int_007", encrypted: true, active: true,
  },
  {
    id: "cr_008", orgId: ORG, providerId: "hubspot", label: "HubSpot — Private App Token",
    type: "oauth_token", maskedValue: "pat-••••••••8c4",
    createdAt: daysAgo(60), lastRotatedAt: daysAgo(10), expiresAt: daysAhead(60),
    integrationId: "int_008", encrypted: true, active: true,
  },
  {
    id: "cr_009", orgId: ORG, providerId: "leados", label: "LeadOS — Service Token",
    type: "api_key", maskedValue: "svc_••••••••1a2b",
    createdAt: daysAgo(180), lastRotatedAt: daysAgo(60), expiresAt: null,
    integrationId: "int_009", encrypted: true, active: true,
  },
  {
    id: "cr_010", orgId: ORG, providerId: "erp", label: "ERP Hub — Service Token",
    type: "api_key", maskedValue: "svc_••••••••3c4d",
    createdAt: daysAgo(180), lastRotatedAt: daysAgo(60), expiresAt: null,
    integrationId: "int_010", encrypted: true, active: true,
  },
];

export function credentialById(id: string): Credential | undefined {
  return credentials.find((c) => c.id === id);
}

/** Credentials expiring within the next N days. */
export function credentialsExpiringSoon(days: number = 14): Credential[] {
  const cutoff = now + days * 86400000;
  return credentials.filter(
    (c) => c.expiresAt !== null && new Date(c.expiresAt).getTime() < cutoff && c.active,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit log (integration-scoped) — 16 entries
// ─────────────────────────────────────────────────────────────────────────────

export const integrationAudit: IntegrationAuditEntry[] = [
  {
    id: "al_001", orgId: ORG, actor: "Aram Hayrapetyan", action: "connect",
    providerId: "signed_webhook", integrationId: "int_005", ip: "146.70.•••.•••",
    userAgent: "Mozilla/5.0 (Macintosh) Chrome/127",
    message: "Connected Signed Webhook (HMAC ingress). Generated endpoint + signing secret.",
    createdAt: daysAgo(120),
  },
  {
    id: "al_002", orgId: ORG, actor: "Aram Hayrapetyan", action: "connect",
    providerId: "telegram", integrationId: "int_002", ip: "146.70.•••.•••",
    userAgent: "Mozilla/5.0 (Macintosh) Chrome/127",
    message: "Connected Telegram bot. Stored bot token (masked).",
    createdAt: daysAgo(90),
  },
  {
    id: "al_003", orgId: ORG, actor: "schedule", action: "sync",
    providerId: "telegram", integrationId: "int_002", ip: "10.0.0.••",
    userAgent: "haydev-worker/1.0",
    message: "Scheduled sync completed: 21 records in / 21 out (412ms).",
    createdAt: minsAgo(3),
  },
  {
    id: "al_004", orgId: ORG, actor: "schedule", action: "sync",
    providerId: "meta", integrationId: "int_001", ip: "10.0.0.••",
    userAgent: "haydev-worker/1.0",
    message: "Scheduled sync FAILED: OAuth token expired; refresh failed.",
    createdAt: daysAgo(1),
  },
  {
    id: "al_005", orgId: ORG, actor: "Aram Hayrapetyan", action: "rotate_credential",
    providerId: "signed_webhook", integrationId: "int_005", ip: "146.70.•••.•••",
    userAgent: "Mozilla/5.0 (Macintosh) Chrome/127",
    message: "Rotated signing secret. Previous secret revoked after 24h grace period.",
    createdAt: daysAgo(7),
  },
  {
    id: "al_006", orgId: ORG, actor: "Aram Hayrapetyan", action: "refresh_auth",
    providerId: "stripe", integrationId: "int_006", ip: "146.70.•••.•••",
    userAgent: "Mozilla/5.0 (Macintosh) Chrome/127",
    message: "Refreshed OAuth tokens (Stripe). Status: REAUTH_REQUIRED (refresh failed).",
    createdAt: daysAgo(3),
  },
  {
    id: "al_007", orgId: ORG, actor: "system", action: "webhook_received",
    providerId: "stripe", integrationId: null, ip: "3.18.••.•••",
    userAgent: "Stripe/1.0",
    message: "Webhook received: invoice.paid (evt_1Na2bc4). HMAC verified.",
    createdAt: minsAgo(22),
  },
  {
    id: "al_008", orgId: ORG, actor: "system", action: "webhook_received",
    providerId: "meta", integrationId: null, ip: "31.13.••.•••",
    userAgent: "facebookplatform/1.0",
    message: "Webhook received: leadgen (evt_meta_441). HMAC verified.",
    createdAt: hoursAgo(3),
  },
  {
    id: "al_009", orgId: ORG, actor: "Aram Hayrapetyan", action: "webhook_replayed",
    providerId: "signed_webhook", integrationId: null, ip: "146.70.•••.•••",
    userAgent: "Mozilla/5.0 (Macintosh) Chrome/127",
    message: "Replayed event evt_9f2a4c3 (invoice.paid). Result: delivered (200).",
    createdAt: minsAgo(31),
  },
  {
    id: "al_010", orgId: ORG, actor: "Aram Hayrapetyan", action: "test",
    providerId: "whatsapp", integrationId: "int_003", ip: "146.70.•••.•••",
    userAgent: "Mozilla/5.0 (Macintosh) Chrome/127",
    message: "Connectivity test: 200 OK (latency 412ms).",
    createdAt: hoursAgo(1),
  },
  {
    id: "al_011", orgId: ORG, actor: "Aram Hayrapetyan", action: "config_updated",
    providerId: "hubspot", integrationId: "int_008", ip: "146.70.•••.•••",
    userAgent: "Mozilla/5.0 (Macintosh) Chrome/127",
    message: "Updated sync direction: one-way → bi-directional. Conflict policy: last-write-wins.",
    createdAt: hoursAgo(1),
  },
  {
    id: "al_012", orgId: ORG, actor: "schedule", action: "sync",
    providerId: "email", integrationId: "int_004", ip: "10.0.0.••",
    userAgent: "haydev-worker/1.0",
    message: "Scheduled sync FAILED: IMAP auth rejected (invalid app password).",
    createdAt: hoursAgo(6),
  },
  {
    id: "al_013", orgId: ORG, actor: "Aram Hayrapetyan", action: "connect",
    providerId: "slack", integrationId: "int_007", ip: "146.70.•••.•••",
    userAgent: "Mozilla/5.0 (Macintosh) Chrome/127",
    message: "Connected Slack workspace. OAuth scopes granted: 4/5.",
    createdAt: daysAgo(75),
  },
  {
    id: "al_014", orgId: ORG, actor: "Aram Hayrapetyan", action: "rotate_credential",
    providerId: "stripe", integrationId: "int_006", ip: "146.70.•••.•••",
    userAgent: "Mozilla/5.0 (Macintosh) Chrome/127",
    message: "Rotated Stripe restricted key. New key expires in 30 days.",
    createdAt: daysAgo(3),
  },
  {
    id: "al_015", orgId: ORG, actor: "Aram Hayrapetyan", action: "disconnect",
    providerId: "meta", integrationId: null, ip: "146.70.•••.•••",
    userAgent: "Mozilla/5.0 (Macintosh) Chrome/127",
    message: "Disconnected stale Meta integration (biz_••••••6c4). Tokens revoked.",
    createdAt: daysAgo(25),
  },
  {
    id: "al_016", orgId: ORG, actor: "Aram Hayrapetyan", action: "revoke_credential",
    providerId: "meta", integrationId: "int_001", ip: "146.70.•••.•••",
    userAgent: "Mozilla/5.0 (Macintosh) Chrome/127",
    message: "Revoked legacy Meta page token (pre-rotation).",
    createdAt: daysAgo(1),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Global settings
// ─────────────────────────────────────────────────────────────────────────────

export const integrationSettings: IntegrationSettings = {
  webhookBaseUrl: "https://api.haydev.os/hooks",
  rateLimitPerMin: 600,
  maxBodySizeKb: 512,
  blockPrivateNetworks: true,
  idempotencyWindowSec: 3600,
  redirectAllowlist: [
    "https://app.haydev.os/oauth/callback",
    "https://staging.haydev.os/oauth/callback",
  ],
  rejectSelfSignedTls: true,
  requireHmac: true,
  defaultSyncCron: "*/15 * * * *",
  autoDisableAfterFailures: 5,
};

// ─────────────────────────────────────────────────────────────────────────────
// Analytics rollups
// ─────────────────────────────────────────────────────────────────────────────

export const statusBreakdown: { status: string; count: number }[] = [
  { status: "connected", count: 7 },
  { status: "degraded", count: 1 },
  { status: "reauth_required", count: 1 },
  { status: "error", count: 1 },
  { status: "disconnected", count: 0 },
];

export const syncSuccessSeries: { day: string; success: number; failed: number; partial: number }[] = [
  { day: "Mon", success: 482, failed: 12, partial: 4 },
  { day: "Tue", success: 521, failed: 8, partial: 6 },
  { day: "Wed", success: 498, failed: 14, partial: 3 },
  { day: "Thu", success: 612, failed: 9, partial: 5 },
  { day: "Fri", success: 724, failed: 18, partial: 8 },
  { day: "Sat", success: 142, failed: 3, partial: 1 },
  { day: "Sun", success: 98, failed: 2, partial: 0 },
];

export const eventsByProvider: { provider: string; events: number }[] = [
  { provider: "Signed Webhook", events: 4218 },
  { provider: "Stripe", events: 1421 },
  { provider: "WhatsApp", events: 821 },
  { provider: "Slack", events: 312 },
  { provider: "HubSpot", events: 198 },
  { provider: "Meta", events: 42 },
];

export const avgDurationByProvider: { provider: string; ms: number }[] = [
  { provider: "HubSpot", ms: 4821 },
  { provider: "Stripe", ms: 2241 },
  { provider: "WhatsApp", ms: 1821 },
  { provider: "Meta", ms: 9412 },
  { provider: "Slack", ms: 612 },
  { provider: "Telegram", ms: 412 },
  { provider: "LeadOS", ms: 92 },
];

export const credentialHealthBuckets: { bucket: string; count: number }[] = [
  { bucket: "Healthy", count: 7 },
  { bucket: "Expiring ≤14d", count: 2 },
  { bucket: "Expired", count: 1 },
  { bucket: "No expiry", count: 4 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Foundation re-export (back-compat)
// ─────────────────────────────────────────────────────────────────────────────

export { mockIntegrations };
