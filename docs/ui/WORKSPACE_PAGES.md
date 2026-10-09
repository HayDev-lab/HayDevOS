# Workspace pages and scrolling

Updated 2026-10-10.

Workspace navigation now uses App Router URLs. The shared workspace layout resolves the server session and retains the shell while a user navigates. The URL selects the module and section; the former persisted active module no longer decides which page opens. API authorization and tenant checks remain in their existing services.

Examples:

| Workspace | URL |
| --- | --- |
| Home | `/` |
| Module catalog | `/modules` |
| Content generator | `/marketing/generator` |
| Video / Audio / Voice / Image / Avatar | `/marketing/generator/{video,audio,voice,image,avatar}` |
| Editing room | `/marketing/editor` |
| LeadOS pipeline | `/leados/pipeline` |
| Quote builder | `/quoteflow/builder` |
| Automation schedules | `/autopilot/schedules` |
| Integration providers | `/connect/providers` |
| Owner AI approvals | `/owner-ai/approvals` |
| Business audit report | `/audit/report` |
| General / Members / Modules settings | `/settings/{general,members,modules}` |

`src/lib/workspace-routes.ts` defines the complete allowlist. Unknown modules, sections and extra path segments produce a 404. Module shortcuts and existing deep-link actions navigate through the shared router. Section navigation uses links, including the former audit, automation and integration tabs. The generator form is a page rather than a dialog.

Legacy IDs in audit recommendations and activity links (`control`, `documentflow`, `erp`, `automation`, `integrations`) are mapped to their current module URLs.

The shell grows with its content instead of clipping it to `100dvh`. Module frames allow content to extend naturally. Chat panes keep a bounded height with their own message scrolling. ScrollArea constrains its viewport for both fixed-height and max-height lists. Dialogs and sheets have viewport limits and vertical scrolling.

Browser verification used a temporary isolated layout fixture with a clearly named preview session, without creating an account or connecting a backend. The fixture and its temporary routing prefix were removed after verification:

- Desktop editing room: document scrolled to its maximum 396 px; footer reached the viewport bottom.
- 390 × 844 editing room and voice generator: last controls and footer were visible at the bottom, with no horizontal page overflow.
- Max-height list: viewport 286 px, content 2880 px, scroll reached 2594 px and displayed the last row.
- Long dialog: scroll reached its maximum 3096 px.
- Long sheet: scroll reached its maximum 3020 px and displayed the last row.
- A real link opened `/marketing/editor`; reload retained the URL and browser Back returned to the previous address. The real unauthenticated route displayed login.

These checks establish local UI behavior. Authenticated backend operations and production deployment were not part of this change. Media generation and rendered-video export retain their existing unavailable state until their services are connected.
