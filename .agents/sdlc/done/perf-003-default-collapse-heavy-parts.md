# Default-collapse heavy parts and lazy-render content

## ID
PERF-003

## Context
Default expansion currently expands text/tool parts, triggering heavy markdown and diff rendering during initial list render. This adds significant CPU and layout cost for large sessions.

## Time Estimate
2 hours

## Acceptance Criteria
- [x] Non-streaming text and tool parts are collapsed by default.
- [x] Collapsed parts render a lightweight preview (no markdown/diff render until expanded).
- [x] User overrides still expand/collapse per item, and streaming parts remain expanded.

## Technical Notes
- Adjust `shouldExpandByDefault` in `components/session/message-list.tsx`.
- Gate expensive render paths in `flat-item-renderer`/`part-item` by `isExpanded`.
- Reuse `part-preview` or add a minimal preview to avoid heavy markdown/diff work.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Default-collapsed non-streaming parts; kept preview-only rendering until expansion. Files changed: components/session/message-list.tsx.
