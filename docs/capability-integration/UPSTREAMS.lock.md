# HayDevOS upstream decision lock

**Created:** 2026-10-09  
**Phase:** 00  
**Status:** BLOCKED / NO UPSTREAM FETCHED OR INSTALLED

This file is an architectural allowlist, not a package installation list. Tags, commits, licenses and security state remain `UNVERIFIED_CURRENT` until the phase that is allowed to access and evaluate that upstream. `main`, `latest` and floating container tags are never acceptable production pins.

| Capability | Upstream URL | Decision | Selected tag | Selected commit/digest | License | Security notes | Integration mode | Data egress | Rollback | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Document parser candidate A | https://github.com/docling-project/docling | BENCHMARK | — | — | UNVERIFIED_CURRENT | Review current advisories; disable unneeded backends/network | Isolated worker only | Private document bytes only to owned worker | Remove worker adapter/jobs; preserve originals | NOT_FETCHED |
| Document parser candidate B | https://github.com/opendataloader-project/opendataloader-pdf | BENCHMARK | — | — | UNVERIFIED_CURRENT | Verify license for the exact selected version and all runtime components | Isolated worker only | Private document bytes only to owned worker | Remove worker adapter/jobs; preserve originals | NOT_FETCHED |
| Conversion baseline | https://github.com/microsoft/markitdown | BENCHMARK_BASELINE | — | — | UNVERIFIED_CURRENT | Review OCR extras and transitive licenses | Benchmark only, not a third production engine | Synthetic/approved corpus only | Delete isolated benchmark environment | NOT_FETCHED |
| Structured document retrieval | https://github.com/VectifyAI/PageIndex | CONDITIONAL | — | — | UNVERIFIED_CURRENT | Evaluate only after stable page citations and a measured gap | Isolated pilot adapter | Parsed tenant content only under approved design | Remove index/adapter and retain baseline retrieval | DEFERRED |
| Telegram connector | https://github.com/grammyjs/grammY | SELECT_FIRST_CONNECTOR | — | — | UNVERIFIED_CURRENT | Verify compatible release and dependency audit | Server-only outbound adapter through AutomationRun | Allowlisted notification fields to Telegram | Disable action and remove adapter; retain audit rows | PLANNED_AFTER_GATE_08 |
| Connector platform | https://github.com/ComposioHQ/composio | DEFER | — | — | UNVERIFIED_CURRENT | Review OAuth, scopes, data processing, security and exit plan | Only after three justified providers | Provider-dependent third-party egress | Direct adapters/export and revoke connections | DEFERRED |
| External workflow platform | https://github.com/n8n-io/n8n | DEFER | — | — | UNVERIFIED_CURRENT | License/use-case review required; never bypass domain services | External non-domain workflows only | Workflow-specific, separately approved | Remove external workflow; core Automation remains | DEFERRED |
| Agent long-term memory | https://github.com/vectorize-io/hindsight | DEFER | — | — | UNVERIFIED_CURRENT | Retention, deletion, privacy and tenant-isolation ADR first | Separate late-stage service, if approved | Inferred memory only under explicit policy | Export/delete memories and disable adapter | DEFERRED |
| GitHub MCP | https://github.com/github/github-mcp-server | DEV_ONLY | — | — | UNVERIFIED_CURRENT | Read-only default; write requires explicit approval | Operator environment only | Repository metadata/code per operator action | Remove local MCP configuration and revoke token | BLOCKED_BY_GIT_LINEAGE |
| Component workshop | https://github.com/storybookjs/storybook | DEV_ONLY_CONDITIONAL | — | — | UNVERIFIED_CURRENT | Re-audit dev dependency graph | Existing component system only | None at runtime | Remove dev config/dependency | DEFERRED |
| Database and private storage | https://github.com/supabase/supabase | ALREADY_PRESENT | managed service | service/project controlled | UNVERIFIED_CURRENT | Existing custom auth remains authority; privileged access server-only | Existing PostgreSQL and private Storage | Existing approved Supabase project | Existing backup/restore and provider rollback plan | PRESENT |
| Supabase implementation guidance | https://github.com/supabase/agent-skills | REFERENCE_ONLY | — | — | UNVERIFIED_CURRENT | Never runtime code or authority | Documentation reference | None | Stop using reference | NOT_A_RUNTIME_DEPENDENCY |
| UI primitives | https://github.com/shadcn-ui/ui | ALREADY_PRESENT_PATTERN | project-local components | project-local | UNVERIFIED_CURRENT | Do not reinitialize or overwrite local components | Existing source components | None | Revert only explicitly changed component | PRESENT |
| Icons | https://github.com/lucide-icons/lucide | ALREADY_PRESENT | resolved package `0.525.0` | package-lock integrity | UNVERIFIED_CURRENT | Keep one icon system unless a concrete gap exists | Existing npm dependency | None | Lockfile/package rollback | PRESENT |
| OpenAPI catalog | https://github.com/APIs-guru/openapi-directory | REFERENCE_ONLY | — | — | UNVERIFIED_CURRENT | Specs are not trusted credentials or runtime connectors | Design-time reference | None unless a spec is manually inspected | Stop using reference | NOT_A_RUNTIME_DEPENDENCY |
| Agent control-plane patterns | https://github.com/paperclipai/paperclip | PATTERN_ONLY | — | — | UNVERIFIED_CURRENT | Must not duplicate Owner AI approvals/control plane | Reference only | None | Stop using reference | DEFERRED |
| Backup product | https://github.com/duplicati/duplicati | DEFER | — | — | UNVERIFIED_CURRENT | Native DB/Storage backup and restore drill must be proven first | None currently | None currently | Not applicable | DEFERRED |
| WhatsApp bridge | https://github.com/evolution-foundation/evolution-api | DEFER_LEGAL_GATE | — | — | UNVERIFIED_CURRENT | Meta ToS, privacy and official API assessment required | None currently | None currently | Not applicable | DEFERRED |
| Helpdesk | https://github.com/faveosuite/faveo-helpdesk | DEFER | — | — | UNVERIFIED_CURRENT | Avoid duplicating LeadOS/tasks without product demand | None currently | None currently | Not applicable | DEFERRED |
| Change monitoring | https://github.com/dgtlmoon/changedetection.io | DEFER | — | — | UNVERIFIED_CURRENT | Requires a defined product use case and data policy | None currently | None currently | Not applicable | DEFERRED |

## Phase 00 decision

No repository was cloned, vendored, installed, executed or connected. All new runtime upstream work remains blocked by unresolved Git lineage and dirty-work ownership. Existing dependencies/services were inventoried only.

## Canonical-line update

The owner selected `origin/main`. A separate worktree was created from cached commit `19dbe1ed3450b18d055cf1cd520cc783da846e15`, but remote refresh failed because GitHub returned `Repository not found`.

Inspection proved that this line is a marketing + LeadOS demo repository and does not contain the multi-module extension points assumed by the initial pack. Therefore every external upstream in this table remains blocked. No parser, connector, workflow, memory, MCP or developer-tool integration may begin until the internal cross-line foundation migration is explicitly selected and verified.
