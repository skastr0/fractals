# Integrate DiffStatsWidget into SessionNode
id: session-diff-session-node

## Context
Parent: session-diff-viewer. Surface diff stats on graph nodes and open the diff pane on click.

## Acceptance Criteria
- [x] AC-1: Session nodes show `DiffStatsWidget` only when session has file diffs (files > 0 or additions/deletions > 0).
- [x] AC-2: Clicking widget opens a diff pane for the session via `usePanes` and sets a meaningful title.
- [x] AC-3: Node layout remains aligned with existing header icons and does not block the subagent badge.

## Technical Notes
- Read diff counts from session summary data or `sessionDiffs` in `SyncProvider`.
- Prefer `panes$.openPane` with type `diff` unless a diff pane is already stacked.
- Consider `panes$.canOpenNewPane('diff')` to avoid overflows.

## Time Estimate
1 hour

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Implemented. Added subscription to `state$.data.sessionDiffs[sessionKey]` for reactive diff data.
- Widget uses `size="sm"` variant positioned between most-recent badge and status dot.
- `DiffStatsWidget` already handles `e.stopPropagation()` to prevent node selection.
- `handleOpenDiff` callback opens diff pane with meaningful title `{sessionTitle} - Diff`.
- Files changed: `components/graph/session-node.tsx`
