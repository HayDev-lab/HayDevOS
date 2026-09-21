# Task 10b — Owner AI Frontend (panel + module console + wiring)

**Agent:** full-stack-developer (Owner AI Frontend)
**Task ID:** 10b
**Status:** ✅ Complete

## Scope

Build the Owner AI frontend that consumes the Task-10a backend:
- `src/components/shell/OwnerAiPanel.tsx` — slide-in chat panel (REPLACE content, keep `OwnerAiPanel` export).
- `src/modules/ownerai/` — full-page module console with 7 tabs.
- `src/lib/modules/registry.ts` — wire `ownerai` slot to `OwnerAiView` (touch ONLY that entry).
- `src/lib/i18n.ts` — ownerai keys already present in en/hy/ru (verified complete).

Do NOT touch backend files (`src/app/api/owner-ai/**`) or `ShellLayout.tsx`.

## Files (final state)

| File | Purpose | Status |
|---|---|---|
| `src/components/shell/OwnerAiPanel.tsx` | Slide-in chat panel. framer-motion slide-from-right (spring, damping 30/stiffness 280). Mobile `fixed inset-0`; desktop `md:right-0 md:top-0 md:h-full md:w-[400px]`. Glassy graphite surface (`glass-strong` + `border-l`). Esc closes UNLESS user is mid-edit in an `<input>`/`<textarea>`/`<select>`/`contenteditable` — first Esc blurs the field, second Esc closes (better UX than the prior contenteditable-only check). Renders `ChatPanel compact` for the actual chat surface so the panel and the full-page view stay in sync via the shared `useOwnerAiStore`. | **Rewritten** (kept `OwnerAiPanel` export). |
| `src/modules/ownerai/OwnerAiView.tsx` | Full-page console. Header with lime Sparkles + Refresh + pending-approval badge. 7 tabs: Chat · Conversations · Agent Runs · Tool Calls · Approvals · Audit · Settings. Refreshes state on mount + tab change. | Pre-existing — verified, **color-tuned** (violet → lime accent for the Owner AI brand). |
| `src/modules/ownerai/components/ChatPanel.tsx` | Reusable chat surface (used by panel `compact` and view `showHeaderActions`). Header: lime Sparkles + mode selector (OBSERVE=cyan / ASSIST=lime / AUTO=violet) + online/offline dot + context chip (org + active module) + refresh + new-conv + close X. Messages list with auto-scroll. User bubble lime right; assistant bubble graphite left + lime avatar. Tool-call cards collapsible monospace. Action cards (lime safe / amber pending / rose rejected). Pending-approval cards with Approve (lime) + Reject (rose) → POST `/api/owner-ai/approve`. Typing-dots indicator. Auto-grow textarea. Enter=send, Shift+Enter=newline. Suggestion chips when empty. Empty state with intro + chips. | Pre-existing — **color-tuned** (violet → lime brand, send button, chips, empty state). |
| `src/modules/ownerai/components/ChatMessage.tsx` | Single chat bubble. User: lime-tinted right + lime User avatar. Assistant: graphite left + lime Sparkles avatar + Markdown body + `[offline]` badge when offline. Renders the message's tool calls / actions / approvals below the bubble. | Pre-existing — **color-tuned** (assistant avatar violet → lime). |
| `src/modules/ownerai/components/ToolCallCard.tsx` | Collapsible monospace card for a single tool call. Cyan chrome (read tools). "Called getAttentionItems → 27 items" summary, expandable args + result preview, copy-args button. | Pre-existing — verified. |
| `src/modules/ownerai/components/ApprovalCard.tsx` | Pending/decided approval card. Amber (pending) / lime (approved) / rose (rejected). Pending shows prominent Approve (lime) + Reject (rose) buttons + optional reason textarea. Decided shows executor + timestamp + reason. | Pre-existing — verified. |
| `src/modules/ownerai/components/TypingDots.tsx` | Three-dot bounce indicator. Reduced-motion safe (globals collapses animations). | Pre-existing — **color-tuned** (violet → lime). |
| `src/modules/ownerai/components/Markdown.tsx` | react-markdown v10 renderer with dark-enterprise component overrides (lime/cyan accents, amber blockquote, no indigo/blue). | Pre-existing — verified. |
| `src/modules/ownerai/components/ChatTab.tsx` | 2-col layout: conversation list (left, GET /state) + active chat (right, ChatPanel non-compact). "New chat" button. Mobile collapses to list-or-chat with back button. | Pre-existing — **color-tuned** (active conv + icons violet → lime). |
| `src/modules/ownerai/components/ConversationsTab.tsx` | Table of conversations (title, mode, msg count, created, updated). Search + New. Click → opens in Chat tab. | Pre-existing — **color-tuned** (icon violet → lime). |
| `src/modules/ownerai/components/AgentRunsTab.tsx` | Table of agent runs (startedAt, mode, status, provider, tools, actions, approvals, duration, correlationId). Expandable row with full details (runId, conversationId, model, error). | Pre-existing — verified. |
| `src/modules/ownerai/components/ToolCallsTab.tsx` | Table of tool calls (ts, name, args summary, result summary + count, duration, runId). Filter by tool name. Expandable args + result preview. | Pre-existing — verified. |
| `src/modules/ownerai/components/ApprovalsTab.tsx` | Pending (cards with inline Approve/Reject) + history table. | Pre-existing — verified. |
| `src/modules/ownerai/components/AuditTab.tsx` | Stats summary cards (conversations, runs, toolCalls, actions, approvals, auditEvents, pending/approved/rejected, executed/failed, online/offline runs) + breakdowns (byProvider/byMode/byStatus) + filterable audit-events table (ts, type, message, correlationId, provider/model, promptVersion). | Pre-existing — verified. |
| `src/modules/ownerai/components/SettingsTab.tsx` | Runtime (provider, model, promptVersion, defaultMode, online/offline status). Forbidden actions (rose). Factuality rules (cyan). Available read tools (cyan). Available actions (lime safe / amber risky / rose forbidden). Reset audit store (POST `/api/owner-ai/reset`) with confirm + toast. | Pre-existing — **color-tuned** (runtime + available-actions accents violet → lime). |
| `src/modules/ownerai/state.ts` | Zustand store owning conversations, activeConversationId, mode, agentRuns, toolCalls, approvals, actions, auditEvents, config. Actions: `init`, `refreshState`, `setMode`, `newConversation`, `selectConversation`, `sendMessage`, `decideApproval`, `resetAudit`. Talks to backend via fetch. Optimistic local appends for the user message + pending assistant placeholder; replaces placeholder on response. Fire-and-forget `refreshState()` after every send/approve to pick up the new run record + audit events. | Pre-existing — verified. |
| `src/modules/ownerai/types.ts` | Re-exports shared backend types. Defines `SUGGESTION_CHIPS` (8 chips: attention, convert, risk, expiring, report, pipeline, health, timeline), `MODES` (OBSERVE/ASSIST/AUTO), `DEFAULT_MODE = "ASSIST"`. | Pre-existing — verified. |
| `src/modules/ownerai/index.ts` | Barrel: default + named `OwnerAiView`, store, constants, types. | Pre-existing — verified. |
| `src/lib/modules/registry.ts` | **Edited** — added `import { OwnerAiView } from "@/modules/ownerai"` and replaced `component: placeholderFor("ownerAi")` with `component: OwnerAiView`. Touched ONLY the `ownerAi` entry (the `settings` entry still uses placeholder, the import of `placeholderFor` stays). | **Edited**. |
| `src/lib/i18n.ts` | ownerai keys already present and complete in all 3 locales (en/hy/ru): title, subtitle, mode + modeDesc, online/offline, newConversation, context.org/module, input.* (placeholder/send/hint), empty.*, chat.thinking/empty/offlineBadge, toolCall.*, approval.* (approve/reject/confirmReject/reasonPlaceholder/approvedBy/rejectedBy/status.*), conversations.* (searchPlaceholder/new/empty/emptyBody/messages/col.*/openInChat), runs.* (col.*/empty/emptyBody/expandDetails), toolCalls.* (col.*/empty/emptyBody/filter.all), approvals.* (col.*/pendingTitle/historyTitle/empty/emptyBody/pendingEmpty/historyEmpty), audit.* (col.*/empty/emptyBody/filter.*/stats.*/byProvider/byMode/byStatus), settings.* (title/subtitle/runtime/defaultMode/provider/model/status/promptVersion/online/offline/forbiddenActions*/factualityRules*/availableTools/availableActions/reset*/toolSafe/toolRisky/toolSafeAction/toolForbidden), view.* (title/subtitle/tab.*), chatTab.* (conversationList/noConversation*/newChat/deleteConv). No new keys needed. | Pre-existing — verified complete (no changes). |

## Wiring

- `src/lib/modules/registry.ts`: `ownerAi` slot now points at `OwnerAiView` (was `placeholderFor("ownerAi")`). All other entries untouched. The `placeholderFor` import remains because `settings` still uses it.
- `src/components/shell/ShellLayout.tsx`: NOT modified (already renders `<OwnerAiPanel />`).
- `src/app/api/owner-ai/**`: NOT modified (Task 10a backend, consumed as-is).

## Design mandate compliance

Premium dark enterprise. Graphite + lime (assistant/safe/approve) + cyan + amber (pending) + rose (rejected/forbidden).

| Surface | Color | Notes |
|---|---|---|
| Panel chrome | graphite (`glass-strong` + `border-l border-border`) | `bg-card/95`-equivalent via glass-strong |
| User bubble | lime-tinted right | `bg-lime/[0.08] border-lime/30` |
| Assistant bubble | graphite left | `bg-card/60 border-border/60` |
| Assistant avatar | lime | `bg-lime/15 text-lime ring-1 ring-lime/30` |
| Tool-call cards | cyan | `border-cyan/20 bg-cyan/[0.03]` |
| Safe-action cards | lime | `border-lime/30 bg-lime/[0.04]` |
| Pending-approval cards | amber | `border-amber/30 bg-amber/[0.04]` |
| Approved cards | lime | `border-lime/30 bg-lime/[0.04]` |
| Rejected cards | rose | `border-rose/30 bg-rose/[0.04]` |
| Forbidden actions (Settings) | rose | `border-rose/30 bg-rose/[0.02]` |
| Factuality rules (Settings) | cyan | `border-cyan/30 bg-cyan/[0.02]` |
| Mode selector | OBSERVE=cyan / ASSIST=lime / AUTO=violet | per-mode semantic |
| Send button | lime | `bg-lime/90 text-background hover:bg-lime` |
| Typing dots | lime | `bg-lime/80 animate-bounce` |
| Owner AI brand icon (panel + view header + empty state) | lime | was violet — color-tuned |

NO indigo/blue anywhere. Reduced-motion safe (globals collapses animations to 0.001ms under `prefers-reduced-motion: reduce`). Responsive: panel is full-screen on mobile, 400px right sheet on md+; ChatTab collapses to list-or-chat on mobile.

## Verification

- ✅ `bunx eslint src/components/shell/OwnerAiPanel.tsx src/modules/ownerai/ src/lib/i18n.ts src/lib/modules/registry.ts` — 0 errors, 0 warnings.
- ✅ `bunx tsc --noEmit` — 0 errors in any Task-10b file (only unrelated errors in `examples/websocket/` and `skills/`).
- ✅ Dev server (Next.js on port 3000) compiles cleanly. `GET /` → 200 (669ms). `POST /api/owner-ai` → 200. `GET /api/owner-ai/state` → 200. `POST /api/owner-ai/approve` → 200 (all confirmed in dev.log).

## Notes for future tasks

- The Owner AI panel + view are fully functional end-to-end: type a question → backend calls the LLM (or offline fallback) → response renders with tool-call cards + action cards + approval cards → risky actions queue for approval → Approve/Reject round-trips through `/api/owner-ai/approve` → store refreshes.
- The shared `useOwnerAiStore` is the single source of truth — the slide-in panel and the full-page view stay in sync automatically.
- The store's `refreshState()` runs after every send + every approval decision (fire-and-forget) so the Conversations/Runs/Tools/Approvals/Audit tabs always reflect the latest state.
- The `accent: "violet"` on the `ownerAi` registry entry is the SIDEBAR accent (the small icon tile in the nav). It is intentionally left as violet to differentiate the module from lime-accented modules (dashboard, leados, erphub) — within the panel/view itself, the assistant brand is lime per the design mandate.
- Three legacy "View" files exist in `src/modules/ownerai/components/` (`ConversationsView.tsx`, `AgentRunsView.tsx`, `ToolCallsView.tsx`) — they are unused (the `*Tab.tsx` versions are what `OwnerAiView` renders). They're left in place because they lint+typecheck cleanly and removing them is out of scope for Task 10b.
