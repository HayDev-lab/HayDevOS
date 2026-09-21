/**
 * ERP / CRM module — barrel export.
 *
 * ErpCrmView is the default export and is wired into the module registry as
 * the component for the `erphub` module id.
 */

export { ErpCrmView } from "./ErpCrmView";
export { default } from "./ErpCrmView";

// Re-export data layer for downstream consumers (dashboards, automations, etc.)
export * from "./data";
