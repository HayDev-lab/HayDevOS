import type { MockProduct } from "./types";

const ORG = "org_haydev";

export const mockProducts: MockProduct[] = [
  {
    id: "pr_001", orgId: ORG, sku: "HAY-GRW-AN", name: "HayDevOS Growth — annual",
    description: "Per-seat annual license for teams up to 50. Includes Leados, QuoteFlow, ERP Hub.",
    price: 1500, currency: "USD", unit: "seat/year", stock: 9999,
  },
  {
    id: "pr_002", orgId: ORG, sku: "HAY-SCL-AN", name: "HayDevOS Scale — annual",
    description: "Per-seat annual license for teams up to 250. Adds Connect and Control.",
    price: 2200, currency: "USD", unit: "seat/year", stock: 9999,
  },
  {
    id: "pr_003", orgId: ORG, sku: "HAY-ENT-AN", name: "HayDevOS Enterprise — annual",
    description: "Unlimited seats, SSO, audit logs, dedicated support.",
    price: 3000, currency: "USD", unit: "seat/year", stock: 9999,
  },
  {
    id: "pr_004", orgId: ORG, sku: "ADD-DOCSMART", name: "DocSmart add-on",
    description: "Document AI classification + extraction credits (1,000 docs/mo).",
    price: 600, currency: "USD", unit: "seat/mo", stock: 9999,
  },
  {
    id: "pr_005", orgId: ORG, sku: "ADD-AUTOPILOT", name: "Autopilot flow credits",
    description: "10,000 automation runs per month with audit trail.",
    price: 28000, currency: "USD", unit: "pack", stock: 9999,
  },
  {
    id: "pr_006", orgId: ORG, sku: "SVC-IMPL", name: "Implementation package",
    description: "Onboarding, data migration, and 2-week rollout with a solutions engineer.",
    price: 12000, currency: "USD", unit: "project", stock: 12,
  },
  {
    id: "pr_007", orgId: ORG, sku: "SVC-ONB", name: "Onboarding & training",
    description: "Role-based training sessions and admin certification.",
    price: 44000, currency: "USD", unit: "project", stock: 8,
  },
  {
    id: "pr_008", orgId: ORG, sku: "SVC-SUP-PREM", name: "Premium support",
    description: "24/7 support with 1-hour SLA and dedicated CSM.",
    price: 10000, currency: "USD", unit: "year", stock: 9999,
  },
  {
    id: "pr_009", orgId: ORG, sku: "ADD-CONNECT", name: "Connect integrations pack",
    description: "Pre-built connectors for Stripe, HubSpot, Slack, Gmail and more.",
    price: 24000, currency: "USD", unit: "year", stock: 9999,
  },
  {
    id: "pr_010", orgId: ORG, sku: "ADD-AUDIT", name: "Audit & compliance module",
    description: "SOC2/GDPR readiness questionnaires, evidence vault, scoring.",
    price: 50000, currency: "USD", unit: "year", stock: 9999,
  },
  {
    id: "pr_011", orgId: ORG, sku: "INT-CUSTOM", name: "Custom integration",
    description: "Bespoke connector to a third-party system of your choice.",
    price: 25000, currency: "USD", unit: "project", stock: 4,
  },
  {
    id: "pr_012", orgId: ORG, sku: "CR-CRED-10K", name: "AI credits — 10K",
    description: "Owner AI conversation credits (10,000 messages).",
    price: 500, currency: "USD", unit: "pack", stock: 9999,
  },
];
