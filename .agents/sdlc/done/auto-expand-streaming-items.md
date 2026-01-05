# Auto-expand streaming items only

id: auto-expand-streaming-items

## Context
Breakdown from performance-and-message-rendering-overhaul so active streaming output is readable without expanding historical items.

## Acceptance Criteria
- [x] AC-1: Only the actively streaming part auto-expands; historical parts remain collapsed.
- [x] AC-2: When streaming ends, the item keeps its current expanded/collapsed state (no auto-expansion of other items).

## Technical Notes
- Detect streaming via `part.time.end` or `isWorking` from `useSession`.
- Apply auto-expand only on new items or on a transition to streaming state.

## Dependencies
implement-expand-collapse-state

## Time Estimate
predicted_hours: 2

## Notes
2026-01-04: Implemented auto-expand for streaming items in message-list.tsx.

**Implementation approach:**
1. AC-1: The `isExpanded` callback checks `item.isStreaming` and returns `true` for streaming items, ensuring they display expanded without adding to `expandedIds` state.
2. AC-2: Added a `useEffect` with `prevStreamingIdsRef` to track streaming item transitions. When an item stops streaming (`isStreaming` changes from true to false), its ID is added to `expandedIds` so it remains expanded.

**Files changed:**
- `components/session/message-list.tsx` - Added prevStreamingIdsRef, modified isExpanded logic, added streaming transition effect
