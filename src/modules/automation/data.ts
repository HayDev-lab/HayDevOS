/**
 * Automation runtime state.
 *
 * Seeded executions, approvals, schedules, workers and analytics were removed.
 * These collections stay empty until a persistent automation service supplies
 * organisation-scoped records.
 */
import { mockAutomations } from "@/lib/mock/automations";
import type {
  Approval,
  Automation,
  AutomationRun,
  AutomationTemplate,
  AutomationVariable,
  EngineSettings,
  Schedule,
  WebhookEndpoint,
  Worker,
} from "./types";

export { mockAutomations };

export const automations: Automation[] = [];
export const automationRuns: AutomationRun[] = [];
export const automationTemplates: AutomationTemplate[] = [];
export const approvals: Approval[] = [];
export const schedules: Schedule[] = [];
export const webhookEndpoints: WebhookEndpoint[] = [];
export const automationVariables: AutomationVariable[] = [];
export const workers: Worker[] = [];

export const engineSettings: EngineSettings = {
  loopProtection: {
    maxDepth: 5,
    reentryPolicy: "block",
    dedupTtlSec: 3600,
  },
  retryPolicy: {
    maxRetries: 3,
    backoffStrategy: "exponential",
    initialDelayMs: 500,
    maxDelayMs: 30000,
  },
  concurrency: {
    maxConcurrentRuns: 50,
    perAutomationLimit: 5,
    queueTimeoutMs: 60000,
  },
};

export const executionsTimeSeries: {
  day: string;
  success: number;
  failed: number;
  awaiting: number;
}[] = [];
export const topAutomationsByRuns: { name: string; runs: number }[] = [];
export const failureReasons: { reason: string; count: number }[] = [];
export const approvalWaitBuckets: { bucket: string; count: number }[] = [];

export function getAutomation(id: string): Automation | undefined {
  return automations.find((automation) => automation.id === id);
}

export function getRun(id: string): AutomationRun | undefined {
  return automationRuns.find((run) => run.id === id);
}
