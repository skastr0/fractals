# WI-06 Session actions use per-session directory

## Context
Actions like sendMessage or model/agent lookup must use the session's own project directory in a global view.

## Acceptance Criteria
- [x] AC-1 useSession.sendMessage uses the session's directory instead of currentProject.
- [x] AC-2 New session creation uses an active project (currentProject or explicit selection) and is disabled if none is available.
- [x] AC-3 useSessionOptions uses the active project for providers/agents, with clear error state when missing.

## Technical Notes
- Derive directory from sessionKey -> metadata lookup.
- Preserve existing error messages for disconnected state.
- Decide how activeProject is chosen when multiple filters are selected (document behavior).

## Notes
2026-01-04: Created from commit plan.
2026-01-04: Updated active project selection, session lookup by metadata, and session options error handling. Files changed: context/ProjectProvider.tsx, components/layout/header.tsx, hooks/useSessionOptions.ts, hooks/useSession.ts, hooks/useSessionStatus.ts.
