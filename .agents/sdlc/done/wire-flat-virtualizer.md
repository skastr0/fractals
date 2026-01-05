# Wire flat virtualizer to MessageList

id: wire-flat-virtualizer

## Context
Breakdown from performance-and-message-rendering-overhaul to replace turn-based virtualization with per-item virtualization.

## Acceptance Criteria
- [x] AC-1: `components/session/message-list.tsx` renders a virtualized list of `FlatItem` rows.
- [x] AC-2: User message rows and assistant part rows render via item components; no `MessageTurn` usage in the main list.
- [x] AC-3: Scroll-to-bottom and message navigation still work with flat items.

## Technical Notes
- Update `components/session/message-list.tsx`.
- Introduce item components in `components/session/` (e.g., `UserMessageItem`, `PartItem`).
- Align `estimateSize` with collapsed row height and `measureElement` for expanded rows.

## Dependencies
create-flat-item-model, build-part-preview-component

## Time Estimate
predicted_hours: 4

## Notes

2026-01-04: Implementation complete.

### Files Created
- `components/session/user-message-item.tsx` - User message row with avatar, metadata, fork controls
- `components/session/assistant-header-item.tsx` - Assistant header row with avatar and model info
- `components/session/part-item.tsx` - Part row using PartPreview component
- `components/session/flat-item-renderer.tsx` - Dispatcher component that routes to correct item

### Files Modified
- `components/session/message-list.tsx` - Major refactor:
  - Replaced turn-based virtualization with flat-item virtualization
  - Now uses `flattenMessages()` to create `FlatItem[]`
  - Virtualizer `estimateSize` changed from 200px to 40px (collapsed height)
  - `overscan` increased from 3 to 5 for smoother scrolling
  - Navigation now tracks by user message ID instead of index
  - Removed `MessageTurn` and `VirtualizedTurn` usage

### Key Changes
1. **Virtualization target**: `flatItems.length` instead of `userMessages.length`
2. **Row height**: `estimateSize: 40` (collapsed) instead of `200` (turn)
3. **Message navigation**: Updated to work with flat items by filtering for `user-message` types
4. **Active state**: Now tracks `activeUserMessageId` instead of numeric index
5. **Scroll behavior**: Preserved - `isPinned`, `showScrollButton`, auto-scroll all working

### Validation
- `bun check` passes (TypeScript + Biome)
- No type errors
- All imports organized
