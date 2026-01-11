# Lazy-render diff output for tool parts

## ID
PERF-005

## Context
`ToolOutputRenderer` renders `PierreDiffView` for edit diffs, which is heavy even when the part is collapsed. Diff rendering should only happen when expanded.

## Time Estimate
1.5 hours

## Acceptance Criteria
- [x] `PierreDiffView` does not mount until the part is expanded.
- [x] Collapsed diff parts show a lightweight summary or “expand to view diff”.
- [x] Non-diff tool outputs remain unchanged.

## Technical Notes
- Gate the diff render on `isExpanded` in the part renderer.
- Consider lazy-loading `PierreDiffView` or memoizing the diff output.
- Use a minimal preview derived from diff metadata if available.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Added collapsed diff summary gating and deferred diff rendering. Files: components/session/part-item.tsx, components/session/parts/tool-output.tsx.
