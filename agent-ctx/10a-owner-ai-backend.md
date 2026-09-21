# Task 10a — Owner AI Backend (API route + tools + audit)

**Agent:** full-stack-developer (Owner AI Backend)
**Task ID:** 10a
**Status:** ✅ Complete

## Scope

Build ONLY the Owner AI backend. Do NOT touch:
- `src/components/shell/OwnerAiPanel.tsx` (Task 10b)
- `src/modules/ownerai/` (Task 10b — already exists)
- `src/lib/modules/registry.ts` (Task 10b)

## Files (final state)

| File | Purpose | Status |
|---|---|---|
| `src/app/api/owner-ai/route.ts` | POST endpoint. Receives `{ messages, conversationId?, mode, orgId, activeModule? }`. Calls z-ai-web-dev-sdk LLM with a tool-calling loop (max 3 turns, max 4 tool calls/turn). Falls back to offline engine when SDK unavailable / empty response. Returns rich `OwnerAiResponse` (superset of the task spec's `{ reply, toolCalls, pendingApproval, conversationId, correlationId }`). | Pre-existing — verified working, not modified. |
| `src/app/api/owner-ai/tools.ts` | Read tools (13) reusing control adapters + safe-action mock executors + risky-action markers. Exports `TOOL_DEFS`, `AVAILABLE_TOOL_NAMES`, `dispatchTool(name, args)`, `summarizeToolResult`, AND new `TOOL_REGISTRY` (name → `{ description, parameters, requiresApproval, kind, execute }`) covering read tools + 4 safe actions + 11 risky actions. | **Edited** — added `TOOL_REGISTRY` + `ToolRegistryEntry`/`ToolParameterSchema` types + `SAFE_ACTION_NAMES_FROM_REGISTRY` / `RISKY_ACTION_NAMES_FROM_REGISTRY` / `TOOL_REGISTRY_SIZE` exports. |
| `src/app/api/owner-ai/offline.ts` | Deterministic offline fallback engine. Keyword-matches the last user message ("attention", "risk", "expire", "report", "summary", "pipeline", "finance", "integration", "timeline", "search", …) → calls relevant read tools locally → returns templated markdown answer tagged with `> ⚠️ **Offline mode**`. | Pre-existing — verified working, not modified. |
| `src/app/api/owner-ai/approve/route.ts` | POST `{ approvalId, decision, reason?, decidedBy, orgId }`. Looks up pending approval in the in-memory store, executes the risky action (mock) when approved, logs to audit, returns `{ approval, action, conversation }`. Reject path symmetric. | Pre-existing — verified working, not modified. |
| `src/app/api/owner-ai/audit.ts` | In-memory audit store (Maps on `globalThis.__HAYDEV_OWNERAI_STORE__`). Functions: `startRun`/`endRun`, `appendMessage`, `addToolCall`, `proposeAction`, `decideApproval`, `addAuditEvent`, `listAuditEvents`, `listConversations`, `listAgentRuns`, `listToolCalls`, `listApprovals`, `listActions`, `getSystemConfig`, `resetAudit`, `executeSafeAction`. Every record carries `correlationId` (= run id) + `promptVersion` + provider/model. | **Edited** — added Task-10a-spec aliases (`logAgentRun`, `logMessage`, `logToolCall`, `logAction`, `logApproval`, `getAuditLog`, `getConversations`, `getAgentRuns`, `getToolCalls`, `getApprovals`, `getActions`) + new `getAuditStats()` returning counts + provider/mode/status breakdowns + online/offline split + lastRunAt/lastEventAt. Removed unused `eslint-disable no-var` directive. |
| `src/app/api/owner-ai/system-prompt.ts` | **Created** — canonical import path for the Owner AI system prompt. Re-exports `buildSystemPrompt`, `PROMPT_VERSION`, `SAFE_ACTION_NAMES`, `RISKY_ACTION_NAMES`, `FORBIDDEN_ACTION_NAMES` from `./prompt`. Adds `buildSystemPromptSimple({ orgName, mode })` (matches the task spec signature) + `SYSTEM_PROMPT_TEMPLATE` (literal spec text as documentation anchor). | **Created**. |
| `src/app/api/owner-ai/prompt.ts` | Rich `buildSystemPrompt({ orgId, orgName, mode, activeModule })` — assembles role + tool list + action classifications + factuality rules + output protocol. `PROMPT_VERSION = "ownerai-v1.0.0"`. | Pre-existing — verified, not modified. |
| `src/app/api/owner-ai/types.ts` | Shared types (server + client): `OwnerAiMode`, `Provider`, `ToolCallRecord`, `ProposedAction`, `Approval`, `OwnerAiMessage`, `Conversation`, `AgentRun`, `AuditEvent`, `OwnerAiSystemConfig`, `OwnerAiRequest`/`OwnerAiResponse`, `OwnerAiApproveRequest`/`OwnerAiApproveResponse`, `OwnerAiStateResponse`. | **Edited** — added `AuditStats` interface + `stats?: AuditStats` field on `OwnerAiStateResponse`. |
| `src/app/api/owner-ai/state/route.ts` | GET `/api/owner-ai/state` — returns full in-memory state + system config. | **Edited** — added `stats: getAuditStats()` to the response. |
| `src/app/api/owner-ai/reset/route.ts` | POST `/api/owner-ai/reset` — wipes the in-memory store. Returns 204. | Pre-existing — not modified. |

## Read tools (13) — all reuse control adapters

| Tool | Source |
|---|---|
| `getExecutiveSnapshot(window)` | `@/modules/control/adapters` → `getExecutiveSnapshot` |
| `getAttentionItems(window)` | `@/modules/control/adapters` → `getAttentionItems` |
| `getSalesSummary(window)` | `@/modules/control/adapters` → `getSalesSummary` |
| `getRiskLeads()` | derived from `mockLeads` (SLA breach + stale high-value) |
| `getQuoteSummary(window)` | `@/modules/control/adapters` → `getQuoteSummary` |
| `getExpiringQuotes(days)` | derived from `mockQuotes` |
| `getDocumentSummary(window)` | `@/modules/control/adapters` → `getDocumentSummary` |
| `getAutomationSummary(window)` | `@/modules/control/adapters` → `getAutomationSummary` |
| `getFailedAutomations()` | derived from `mockAutomations` |
| `getFinanceSummary(window)` | `@/modules/control/adapters` → `getFinanceSummary` |
| `getIntegrationHealth(window)` | `@/modules/control/adapters` → `getIntegrationHealth` |
| `searchGlobal(query)` | derived from `mockLeads`/`mockQuotes`/`mockDocuments`/`mockCustomers` |
| `getTimeline(window)` | derived from all mock sources |

## Actions

- **Safe (auto-execute, mock):** `createTask`, `createInternalNote`, `assignTask`, `generateReport`.
- **Risky (return as `pendingApproval`, do NOT execute):** `runApprovedAutomation`, `sendExternalMessage`, `setLeadStage`, `markQuoteWon`, `markQuoteLost`, `archiveRecord`, `deleteRecord`, `mutateFinancialRecord`, `sendWebhook`, `changeIntegrationConfig`, `highImpactAutomation`.
- **Forbidden (never executable):** `rawSql`, `shellExec`, `fsAccess`, `secretExport`, `arbitraryHttp`, `bypassApproval`.

## Tool-calling loop

The z-ai-web-dev-sdk chat completions API doesn't expose native function-calling in our integration, so `route.ts` implements a robust text-protocol loop:
1. Send system prompt + history as `assistant`/`user` messages.
2. Parse the LLM response for fenced ` ```tool-call ` blocks containing `{"tool":"<name>","args":{...}}`.
3. Dispatch each tool via `dispatchTool`, append ` ```tool-result ` blocks as a synthetic user message.
4. Re-prompt (max 3 turns). Cap 4 tool calls per turn.
5. Strip tool-call/action blocks from the final answer.
6. Parse ` ```action ` blocks → `proposeAction` (safe = executed, risky = pending approval).

## API contract for Task 10b

### POST `/api/owner-ai`

**Request:**
```ts
{
  messages: { role: "user" | "assistant"; content: string }[];
  conversationId?: string;
  mode: "OBSERVE" | "ASSIST" | "AUTO";
  orgId: string;
  activeModule?: string;
}
```

**Response (200):**
```ts
{
  conversationId: string;         // existing or newly-created
  runId: string;                  // = correlationId
  correlationId: string;
  message: {
    id: string;
    role: "assistant";
    content: string;              // ← the reply (markdown)
    ts: string;                   // ISO
    offline?: boolean;
    toolCallIds?: string[];
    actionIds?: string[];
    approvalIds?: string[];
  };
  toolCalls: ToolCallRecord[];    // each: { id, name, args, resultSummary, resultPreview, resultCount?, durationMs, ts, runId, conversationId }
  proposedActions: ProposedAction[];   // safe + risky
  pendingApprovals: Approval[];        // subset of proposedActions (safety=risky, status=pending_approval)
  online: boolean;                // true = LLM used, false = offline fallback
  provider: "z-ai-web-dev-sdk" | "offline-fallback";
  model?: string;                 // e.g. "glm-4-plus"
  error?: string;                 // non-fatal — fallback may still have answered
}
```

### POST `/api/owner-ai/approve`

**Request:**
```ts
{
  approvalId: string;
  decision: "approved" | "rejected";
  reason?: string;
  decidedBy: string;
  orgId: string;
}
```

**Response (200):**
```ts
{
  approval: Approval;             // status now "approved" | "rejected", has decidedAt/decidedBy
  action: ProposedAction;         // status "executed" (approved) or "rejected"
  conversation: Conversation;
}
```

**Errors:** 400 (bad body), 404 (approval not found), 409 (already decided), 500 (execution error).

### GET `/api/owner-ai/state`

Returns `{ conversations, agentRuns, toolCalls, approvals, actions, auditEvents, config, stats }`. `stats` is the new aggregate (`getAuditStats()`).

### POST `/api/owner-ai/reset`

Returns 204, wipes the in-memory store.

## Verification

- ✅ `bunx eslint src/app/api/owner-ai/` — 0 errors, 0 warnings.
- ✅ `bunx tsc --noEmit` — 0 errors in any `src/app/api/owner-ai/**` file.
- ✅ Dev server (Next.js on port 3000) compiles + serves the route.
- ✅ `curl -X POST http://localhost:3000/api/owner-ai -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"what needs attention today?"}],"mode":"ASSIST"}'` → 200 JSON with real LLM answer (online).
- ✅ OBSERVE mode: read-only, no actions proposed.
- ✅ Risky action test ("mark quote q_002 as lost") → produced `pendingApproval` with `action: "markQuoteLost"`; POST `/api/owner-ai/approve` with `decision:"approved"` → action.status=`executed`, result=`"Quote q_002 marked LOST (mock — no DB write)"`.
- ✅ GET `/api/owner-ai/state` → includes `stats` field with counts + provider/mode/status breakdowns.

## Online / Offline status

**ONLINE.** The z-ai-web-dev-sdk auto-discovers credentials from the environment (no explicit `ZAI_API_KEY` needed in `.env` — the SDK uses its built-in auth). `ZAI.create()` succeeds, `chat.completions.create()` returns real model output. Provider = `z-ai-web-dev-sdk`. The offline fallback is wired and tested-by-code-review but does NOT trigger in this environment.

If the SDK ever fails (no creds, network), `route.ts` catches the error, logs an `offline_fallback` audit event, and delegates to `offlineRespond()` which produces a templated markdown answer tagged with `> ⚠️ **Offline mode**` using the same read tools. The panel always works for demo.

## Key design decisions

1. **System-prompt.ts is a façade** — the actual prompt assembly lives in `prompt.ts` (pre-existing, richer). `system-prompt.ts` re-exports it + adds the spec-literal `SYSTEM_PROMPT_TEMPLATE` + a `buildSystemPromptSimple({ orgName, mode })` matching the task signature. Both naming schemes work.
2. **TOOL_REGISTRY is metadata + execute** — `kind` discriminates read/safe-action/risky-action. `requiresApproval` is the boolean the task asked for. `execute` for read tools returns data; for safe actions runs the mock; for risky actions returns `{ requiresApproval: true, action, args }` WITHOUT executing (the route's `proposeAction` flow handles queuing).
3. **Audit aliases are non-breaking** — the Task 10a spec names (`logAgentRun`, `logMessage`, `logToolCall`, `logAction`, `logApproval`, `getAuditLog`, `getConversations`, `getAgentRuns`, `getToolCalls`, `getApprovals`) are thin wrappers over the richer pre-existing functions. Both naming schemes coexist.
4. **`getAuditStats()` is exposed via `/state`** — added `stats?: AuditStats` to `OwnerAiStateResponse` (optional, backward-compatible) and wired it into the state route. Task 10b can read `state.stats` for the Settings/Audit tabs.
5. **No circular imports** — `tools.ts` inlines the safe-action mock logic (instead of importing `executeSafeAction` from `audit.ts`) to keep `tools ↔ audit` dependency one-directional.
6. **Rich response shape is a superset** — the task spec's `{ reply, toolCalls, pendingApproval, conversationId, correlationId }` maps to `message.content`, `toolCalls`, `pendingApprovals[0]`, `conversationId`, `correlationId`. Task 10b's frontend (already exists in `src/modules/ownerai/`) consumes the rich shape directly.

## Hand-off notes for Task 10b

- The backend is fully working and ONLINE. No frontend changes are required for the panel to function.
- `src/modules/ownerai/` already exists (state.ts + components/*). If Task 10b needs to extend it, the API contract above is stable.
- The `stats` field on `GET /api/owner-ai/state` is new — available for any Audit/Settings UI.
- `TOOL_REGISTRY` is server-side only (in `src/app/api/owner-ai/tools.ts`). If the UI needs the registry, expose it via a new GET endpoint or extend `/state`. Do NOT import `tools.ts` from client code (it transitively imports `@/modules/control/adapters` which imports `@/lib/mock` — server-only).
- `SYSTEM_PROMPT_TEMPLATE` in `system-prompt.ts` is the literal spec text — useful for a "View system prompt" dialog in the Settings tab.
