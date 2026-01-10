# Integrate DiffStatsWidget into SessionPaneHeader
id: session-diff-session-pane-header

## Context
Parent: session-diff-viewer. Show diff stats in the session pane header and open DiffPane from the header.

## Acceptance Criteria
- [x] AC-1: `SessionPaneHeaderContent` renders `DiffStatsWidget` when session has diffs.
- [x] AC-2: Clicking widget opens DiffPane for the current session using the panes provider.
- [x] AC-3: Header updates correctly when stacking sessions in the same pane.

## Technical Notes
- Reuse the same `DiffStatsWidget` component from the session node integration.
- Access diff stats via session summary data or `state$.data.sessionDiffs`.
- Keep header layout compact alongside token stats.

## Time Estimate
1 hour

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Implemented. Added subscription to `state$.data.sessionDiffs[sessionKey]` with `use$` for reactivity.
- Widget placed after cost stat and before subagent/fork badges.
- Uses `size="sm"` variant for compact header display.
- `handleOpenDiff` callback opens diff pane with meaningful title `{sessionTitle} - Diff`.
- Header reactivity preserved - widget updates when switching stacked sessions.
- Files changed: `components/panes/session-pane.tsx`
