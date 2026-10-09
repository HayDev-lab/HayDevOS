/** Public workspace URLs. Kept free of client imports for server validation. */
export const workspaceSections = {
  dashboard: [],
  modules: [],
  marketing: ["overview", "projects", "editor", "resources", "campaigns", "calendar", "approvals", "publishing", "analytics", "generator"],
  leados: ["dashboard", "leads", "pipeline", "tasks", "sources", "analytics", "team", "settings"],
  quoteflow: ["quotes", "builder", "requests", "catalog", "approvals", "analytics", "settings"],
  docsmart: [],
  autopilot: ["automations", "builder", "templates", "executions", "failed", "approvals", "schedules", "webhooks", "variables", "workers", "analytics", "settings"],
  erphub: ["overview", "orders", "catalog", "inventory", "payments", "customers"],
  connect: ["providers", "connected", "credentials", "sync", "webhooks", "analytics", "audit", "settings"],
  ownerAi: ["chat", "conversations", "runs", "tools", "approvals", "audit", "settings"],
  audit: ["questionnaire", "report", "history", "compare", "automation", "recommendations", "settings"],
  settings: ["general", "members", "modules"],
} as const;

export type WorkspaceModule = keyof typeof workspaceSections;
export const generatorTypes = ["video", "audio", "voice", "image", "avatar"] as const;
export type WorkspaceRoute = { moduleId: WorkspaceModule; section?: string; generatorType?: number };

const moduleSlug = (id: WorkspaceModule) => id === "ownerAi" ? "owner-ai" : id;
const legacyModuleIds: Record<string, WorkspaceModule> = {
  control: "dashboard",
  documentflow: "docsmart",
  erp: "erphub",
  automation: "autopilot",
  integrations: "connect",
};

export function workspaceHref(moduleId: string, section?: string): string {
  // Audit recommendations and activity links still contain these retired IDs.
  const normalized = Object.hasOwn(legacyModuleIds, moduleId) ? legacyModuleIds[moduleId] : moduleId;
  if (!Object.hasOwn(workspaceSections, normalized)) throw new Error(`Unknown workspace: ${moduleId}`);
  const id = normalized as WorkspaceModule;
  const base = id === "dashboard" ? "/" : `/${moduleSlug(id)}`;
  const path = section ? `${base}/${section}` : base;
  if (!resolveWorkspaceRoute(path)) throw new Error(`Unknown workspace page: ${path}`);
  return path;
}

export function resolveWorkspaceRoute(pathname: string): WorkspaceRoute | null {
  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (!parts.length) return { moduleId: "dashboard" };
  const slug = parts[0] === "owner-ai" ? "ownerAi" : parts[0];
  if (!Object.hasOwn(workspaceSections, slug)) return null;
  const moduleId = slug as WorkspaceModule;
  const section = parts[1];
  if (parts.length === 1) return { moduleId };
  if (!(workspaceSections[moduleId] as readonly string[]).includes(section)) return null;
  if (parts.length === 2) return { moduleId, section };
  if (parts.length === 3 && moduleId === "marketing" && section === "generator") {
    const index = (generatorTypes as readonly string[]).indexOf(parts[2]);
    if (index >= 0) return { moduleId, section, generatorType: index };
  }
  return null;
}
