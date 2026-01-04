# WI-01 Multi-project filter state and UI

## Context
Replace single project selection with multi-select filters while keeping an active project for actions (create session, model/agent lists).

## Acceptance Criteria
- [x] AC-1 ProjectProvider exposes selectedProjectIds plus toggle/clear helpers and keeps currentProject (or activeProject) available for actions.
- [x] AC-2 ProjectSelector allows selecting multiple projects with clear selected indicators and an "All projects" state when none are selected.
- [x] AC-3 Selected filters are readable from useProject without triggering data refreshes.

## Technical Notes
- Default selectedProjectIds is empty meaning "all projects".
- Keep existing search behavior and sorting.
- Prefer minimal storage changes; if persisted, document the key.

## Notes
2026-01-04: Created from commit plan.
2026-01-04: Added selectedProjectIds with toggle/clear helpers and multi-select UI. No new persistence beyond existing `opencode-last-project`.
2026-01-04: Applied selectedProjectIds filtering in useSessions by project directory.

## Review Notes
2026-01-04: Review found blocking issues. See review-findings packet.
- **Blocking**: `useSessions` ignores `selectedProjectIds`. The UI allows selection, but the list shows all sessions from all projects.
- **Fix**: Update `useSessions.ts` to consume `useProject` and filter the session list.
