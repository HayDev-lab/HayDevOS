/**
 * LeadOS module barrel.
 *
 * Exports `LeadOSView` as the default + named export. Task 12 will import this
 * into the module registry to replace the placeholder for the `leados` slot.
 */

export { LeadOSView, LeadOSView as default } from "./LeadOSView";
export type { LeadRecord, LeadStage, LeadSource } from "./data";
