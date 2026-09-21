/**
 * Automation Builder module — public barrel.
 *
 * Default export: AutomationBuilderView (the Autopilot module view).
 */

export { AutomationBuilderView } from "./AutomationBuilderView";
export { default } from "./AutomationBuilderView";

// Type re-exports for downstream consumers.
export type {
  TriggerType,
  ConditionOp,
  ActionType,
  AutomationStatus,
  Trigger,
  Condition,
  Action,
  Automation,
  RunStatus,
  StepKind,
  StepStatus,
  ExecutionStep,
  AutomationRun,
  AutomationTemplate,
  ApprovalStatus,
  Approval,
  Schedule,
  WebhookEndpoint,
  AutomationVariable,
  WorkerStatus,
  Worker,
  EngineSettings,
} from "./types";

// Data re-exports for convenience.
export {
  automations,
  automationRuns,
  automationTemplates,
  approvals,
  schedules,
  webhookEndpoints,
  automationVariables,
  workers,
  engineSettings,
  executionsTimeSeries,
  topAutomationsByRuns,
  failureReasons,
  approvalWaitBuckets,
  getAutomation,
  getRun,
} from "./data";
