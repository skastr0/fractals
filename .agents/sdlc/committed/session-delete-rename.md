# Add Delete and Rename Session Capabilities

## Context
Users need to rename and delete sessions from the SessionPane. Add actions with confirmation and error handling.

## Acceptance Criteria
- [ ] SessionPane header shows Rename and Delete actions with clear affordances.
- [ ] Rename dialog pre-fills current title and blocks empty values; successful save updates title in UI.
- [ ] Delete dialog requires confirmation and uses destructive styling; successful delete closes the pane and removes the session from the graph.
- [ ] Errors are surfaced inline; actions disable while requests are in flight.
- [ ] ESC closes dialogs and restores focus to the trigger.

## Technical Implementation Notes
- `components/panes/session-pane.tsx`: add action buttons near `SessionStatusBadge` / `RevertControls`.
- Use `Dialog` + `Input` from `components/ui` for rename and delete confirmation.
- Use `sessionService.updateTitle(sessionId, title)` and `sessionService.delete(sessionId)`.
- Derive `sessionId` via `resolveSessionKey(sessionKey)`; close pane using `panes$.closePane('session')` or `panes$.unstackPaneOnce('session')`.

## Estimated Complexity
Medium (2-4 hours)

## Dependencies
None

## Notes
2026-01-05: Created from commit plan.
