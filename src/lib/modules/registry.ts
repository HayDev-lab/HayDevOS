"use client";

/**
 * HayDevOS Module Registry — the contract every module implements.
 * Each manifest binds a stable navigation id to its current React component.
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
  Sparkles,
  ClipboardCheck,
  Settings,
  Grid3X3,
  Megaphone,
} from "lucide-react";
import type { ComponentType } from "react";
import { ModulesView } from "@/components/core/ModulesView";
import { MarketingView } from "@/components/core/MarketingView";
import { SettingsWorkspace } from "@/components/core/SettingsWorkspace";
import { CoreHome } from "@/components/core/CoreHome";
import { ErpCrmView } from "@/modules/erp";
import { DocumentFlowView } from "@/modules/documentflow";
import { AutomationBuilderView } from "@/modules/automation";
import { QuoteFlowView } from "@/modules/quoteflow";
import { LeadOSView } from "@/modules/leados";
import { IntegrationHubView } from "@/modules/integrations";
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
// Both the catalog and core orbit use these stable module bindings.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Registry — connected workspaces and the core dashboard
// ─────────────────────────────────────────────────────────────────────────────

export const ModuleRegistry: ModuleManifest[] = [
  {
    id: "modules", nameKey: "core.modules", icon: Grid3X3, category: "core",
    route: "modules", description: "Explore the HayDevOS ecosystem.", accent: "cyan", component: ModulesView,
  },
  {
    id: "marketing", nameKey: "core.marketing", icon: Megaphone, category: "operations",
    route: "marketing", description: "Content preparation and connected marketing workflows.", accent: "amber", component: MarketingView,
  },
  {
    id: "dashboard",
    nameKey: "nav.dashboard",
    icon: LayoutDashboard,
    category: "core",
    route: "dashboard",
    description: "Operational overview across every module.",
    accent: "lime",
    component: CoreHome,
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
    component: SettingsWorkspace,
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
