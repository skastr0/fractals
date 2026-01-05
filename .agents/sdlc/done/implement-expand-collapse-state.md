# Implement expand/collapse state for flat items

id: implement-expand-collapse-state

## Context
Breakdown from performance-and-message-rendering-overhaul to support collapsed-by-default message rows.

## Acceptance Criteria
- [x] AC-1: Expansion state is tracked per `FlatItem` id and persists across virtualization.
- [x] AC-2: Items default to collapsed unless explicitly expanded or flagged as streaming.

## Technical Notes
- State likely lives in `components/session/message-list.tsx` or a new hook.
- Use stable keys (`messageId` + `partId`) for the expand map/set.
- Expose `onToggle` handlers to `PartItem`.

## Dependencies
wire-flat-virtualizer

## Time Estimate
predicted_hours: 3

## Implementation Notes

### 2025-01-04: Completed

**Files Changed:**
- `components/session/message-list.tsx` - Added `expandedIds` state (Set<string>) with `toggleExpand` and `isExpanded` callbacks
- `components/session/flat-item-renderer.tsx` - Added `isExpanded` and `onToggle` props, passed to PartItem
- `components/session/part-item.tsx` - Made items clickable with button wrapper, shows expanded JSON content when expanded
- `components/session/part-preview.tsx` - Added `isExpanded` prop to rotate chevron icon 90° when expanded

**Design Decisions:**
- Used `Set<string>` for O(1) expansion lookups
- Streaming items (`isStreaming === true`) are auto-expanded per AC-2
- Stable callbacks via `useCallback` to prevent unnecessary re-renders
- Chevron rotates with smooth 150ms transition for polish
- Expanded content shows as JSON placeholder (lazy-render-expanded-content work item will implement full rendering)
- Button element used for clickable preview with proper focus states and aria-expanded attribute

**Validation:**
- `bun check` passes (biome + tsc)
