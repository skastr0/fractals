# Stabilize session node data references

id: stabilize-session-node-data

## Context
Breakdown from performance-and-message-rendering-overhaul to reduce ReactFlow node re-renders from unstable `data` objects.

## Acceptance Criteria
- [ ] AC-1: Node `data` references are reused when session attributes have not changed.
- [ ] AC-2: `components/graph/session-node.tsx` avoids re-rendering for unrelated updates.

## Technical Notes
- Target files: `lib/graph/tree-builder.ts`, `hooks/useSessionGraph.ts`, `components/graph/session-node.tsx`.
- Cache node data per session id and only update changed fields (status, collapse state, child count).
- Keep `onToggleCollapse` stable (avoid inline closures per node).

## Dependencies
none

## Time Estimate
predicted_hours: 3
