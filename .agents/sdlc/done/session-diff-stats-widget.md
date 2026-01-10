# Build DiffStatsWidget component
id: session-diff-stats-widget

## Context
Parent: session-diff-viewer. Provide a shared UI widget for session nodes and pane headers.

## Acceptance Criteria
- [ ] AC-1: Component renders +N/-M counts with green/red styles and an optional file count tooltip.
- [ ] AC-2: Widget uses button semantics and invokes an `onOpen` callback when clicked.
- [ ] AC-3: When additions/deletions are zero, widget is hidden or disabled per design guidance.

## Technical Notes
- Follow the compact badge styling used for the subagent button in `components/graph/session-node.tsx`.
- Consider `tailwind-variants` for consistent sizing and state styles.
- Accept props such as `additions`, `deletions`, `files`, and `onOpen`.

## Time Estimate
1 hour

## Notes
2026-01-10: Created from commit plan.
