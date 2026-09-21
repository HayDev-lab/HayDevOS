"use client";

/**
 * HayDevOS Module Registry — the contract every module implements.
 * Other agents fill in the `component` for each module (Tasks 3-11).
 *
 * This module is client-side because it holds React component references
 * (including client components) and is consumed by the client app shell.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Target,
  FileText,
  ScanLine,
  Workflow,
  Boxes,
  Plug,
  Gauge,
  Sparkles,
  ClipboardCheck,
  Settings,
} from "lucide-react";
import type { ComponentType } from "react";
import { placeholderFor } from "./placeholder";
import { DashboardView } from "@/components/shell/DashboardView";
import { ErpCrmView } from "@/modules/erp";
import { DocumentFlowView } from "@/modules/documentflow";
import { AutomationBuilderView } from "@/modules/automation";
import { QuoteFlowView } from "@/modules/quoteflow";
import { LeadOSView } from "@/modules/leados";
import { IntegrationHubView } from "@/modules/integrations";
import { ControlView } from "@/modules/control";
import { BusinessAuditView } from "@/modules/audit";
import { OwnerAiView } from "@/modules/ownerai";

export type ModuleCategory =
  | "core"
  | "operations"
  | "intelligence"
  | "integrations";

export type ModuleAccent =
  | "lime"
  | "cyan"
  | "amber"
  | "rose"
  | "violet";

export interface ModuleManifest {
  /** Stable id, e.g. "leados" */
  id: string;
  /** i18n key, e.g. "module.leados" */
  nameKey: string;
  /** Icon component */
  icon: LucideIcon;
  /** Logical grouping for sidebar/registry */
  category: ModuleCategory;
  /** Internal route key (single-page app switches on this) */
  route: string;
  /** Short description (English fallback) */
  description: string;
  /** Accent color token used for glow/active states */
  accent: ModuleAccent;
  /** The React component rendered when this module is active */
  component: ComponentType;
  /** Optional permission keys required to view (future) */
  requiredPermissions?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder binding — used until each module's real view lands (Tasks 3-11).
// Other agents should overwrite the `component` field for their module by
// importing their view and replacing `placeholderFor(id)` with it.
// ─────────────────────────────────────────────────────────────────────────────

// (placeholderFor is imported from ./placeholder to keep this file JSX-free.)

// ─────────────────────────────────────────────────────────────────────────────
// Registry — 10 modules + dashboard
// ─────────────────────────────────────────────────────────────────────────────

export const ModuleRegistry: ModuleManifest[] = [
  {
    id: "dashboard",
    nameKey: "nav.dashboard",
    icon: LayoutDashboard,
    category: "core",
    route: "dashboard",
    description: "Operational overview across every module.",
    accent: "lime",
    component: DashboardView,
  },
  {
    id: "leados",
    nameKey: "module.leados",
    icon: Target,
    category: "core",
    route: "leados",
    description: "Lead-to-cash pipeline with SLA tracking.",
    accent: "lime",
    component: LeadOSView,
  },
  {
    id: "quoteflow",
    nameKey: "module.quoteflow",
    icon: FileText,
    category: "core",
    route: "quoteflow",
    description: "Quotes, versioning, approvals and e-sign.",
    accent: "cyan",
    component: QuoteFlowView,
  },
  {
    id: "docsmart",
    nameKey: "module.docsmart",
    icon: ScanLine,
    category: "operations",
    route: "docsmart",
    description: "Document AI — classify, extract, review.",
    accent: "amber",
    component: DocumentFlowView,
  },
  {
    id: "autopilot",
    nameKey: "module.autopilot",
    icon: Workflow,
    category: "operations",
    route: "autopilot",
    description: "No-code automations & approval flows.",
    accent: "violet",
    component: AutomationBuilderView,
  },
  {
    id: "erphub",
    nameKey: "module.erphub",
    icon: Boxes,
    category: "operations",
    route: "erphub",
    description: "Customers, orders, invoices, payments.",
    accent: "lime",
    component: ErpCrmView,
  },
  {
    id: "connect",
    nameKey: "module.connect",
    icon: Plug,
    category: "integrations",
    route: "connect",
    description: "Integrations & webhooks across providers.",
    accent: "cyan",
    component: IntegrationHubView,
  },
  {
    id: "control",
    nameKey: "module.control",
    icon: Gauge,
    category: "intelligence",
    route: "control",
    description: "KPIs, SLAs and operational dashboards.",
    accent: "amber",
    component: ControlView,
  },
  {
    id: "ownerAi",
    nameKey: "module.ownerAi",
    icon: Sparkles,
    category: "intelligence",
    route: "ownerAi",
    description: "Your AI co-founder and ops assistant.",
    accent: "violet",
    component: OwnerAiView,
  },
  {
    id: "audit",
    nameKey: "module.audit",
    icon: ClipboardCheck,
    category: "intelligence",
    route: "audit",
    description: "Readiness scoring & compliance questionnaires.",
    accent: "rose",
    component: BusinessAuditView,
  },
  {
    id: "settings",
    nameKey: "module.settings",
    icon: Settings,
    category: "core",
    route: "settings",
    description: "Org, members, billing and preferences.",
    accent: "lime",
    component: placeholderFor("settings"),
  },
];

/** Get a module manifest by id. */
export function getModule(id: string): ModuleManifest | undefined {
  return ModuleRegistry.find((m) => m.id === id);
}

/** List all registered modules. */
export function listModules(): ModuleManifest[] {
  return ModuleRegistry;
}

/** List modules filtered by category. */
export function listModulesByCategory(category: ModuleCategory): ModuleManifest[] {
  return ModuleRegistry.filter((m) => m.category === category);
}

/** Accent → CSS var helper for inline styles / className composition. */
export function accentVar(accent: ModuleAccent): string {
  return `var(--accent-${accent})`;
}
