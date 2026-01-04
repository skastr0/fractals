# P2-05 - Improve Session Ordering in Graph

## Context
Sessions appear scattered without clear ordering. User reported "sessions seem to be all over the place".

## Acceptance Criteria
- [x] Most recently active sessions appear at top
- [x] Sorting is by last updated, not created
- [x] Clear, predictable ordering

## Notes
- 2026-01-02: Sorted sessions by updated time descending and preserved layout order. Files changed: lib/graph/tree-builder.ts, hooks/useSessionGraph.ts
