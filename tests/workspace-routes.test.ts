import { describe, expect, test } from "bun:test";
import { generatorTypes, resolveWorkspaceRoute, workspaceHref, workspaceSections, type WorkspaceModule } from "../src/lib/workspace-routes";

describe("workspace page URLs", () => {
  test("all registered workspaces and sections can be opened directly", () => {
    for (const moduleId of Object.keys(workspaceSections) as WorkspaceModule[]) {
      const sections = workspaceSections[moduleId];
      expect(resolveWorkspaceRoute(workspaceHref(moduleId))?.moduleId).toBe(moduleId);
      for (const section of sections) {
        expect(resolveWorkspaceRoute(workspaceHref(moduleId, section))).toEqual({ moduleId, section });
      }
    }
  });
  test("studio deep links select the requested media type", () => {
    for (const [generatorType, slug] of generatorTypes.entries()) {
      expect(resolveWorkspaceRoute(`/marketing/generator/${slug}`)).toEqual({ moduleId: "marketing", section: "generator", generatorType });
    }
    expect(resolveWorkspaceRoute("/marketing/editor")).toEqual({ moduleId: "marketing", section: "editor" });
  });
  test("retired module IDs and owner AI links have canonical destinations", () => {
    expect(workspaceHref("control")).toBe("/");
    for (const [legacy, canonical] of Object.entries({ documentflow: "docsmart", erp: "erphub", automation: "autopilot", integrations: "connect" })) {
      expect(workspaceHref(legacy)).toBe(`/${canonical}`);
    }
    expect(workspaceHref("ownerAi", "approvals")).toBe("/owner-ai/approvals");
    expect(workspaceHref("autopilot", "schedules")).toBe("/autopilot/schedules");
    expect(resolveWorkspaceRoute("/owner-ai/approvals/")?.section).toBe("approvals");
  });
  test("unknown modules, sections and extra path segments do not resolve", () => {
    for (const path of ["/unknown", "/marketing/missing", "/marketing/generator/unknown", "/marketing/editor/extra", "/modules/extra", "/leados/leads/extra", "/constructor", "/__proto__", "//example.com"]) {
      expect(resolveWorkspaceRoute(path)).toBeNull();
    }
    expect(() => workspaceHref("unknown")).toThrow();
    expect(() => workspaceHref("leados", "../settings")).toThrow();
  });
});
