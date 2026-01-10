# Fix Streaming Part Subscription

## Context
Messages appear abruptly instead of streaming because `useSession.getParts()` uses `.peek()` which reads without subscribing to Legend State observables. When `message.part.updated` events arrive and update `state$.data.parts`, the UI doesn't re-render.

## Root Cause
```typescript
// useSession.ts line 92-96
const getParts = useCallback(
  (messageId: string): Part[] => {
    const allParts = state$.data.parts.peek()  // ← peek() = NO SUBSCRIPTION!
    return allParts?.[messageId] ?? []
  },
  [state$],
)
```

`MessageList.tsx` then uses this in a `useMemo`:
```typescript
const flatItems = useMemo(
  () => flattenMessages({ messages: sortedMessages, getParts }),
  [sortedMessages, getParts],  // ← getParts reference never changes!
)
```

## Solution
Add a reactive subscription to parts that triggers re-renders when parts update.

## Acceptance Criteria
- [ ] Parts update in real-time as `message.part.updated` events arrive
- [ ] Text streams character-by-character (or chunk-by-chunk as server sends)
- [ ] No performance regression (avoid subscribing to ALL parts)
- [ ] StreamingMarkdown receives updated content and shows streaming state

## Technical Approach
Option A: Subscribe to parts for visible messages only
Option B: Add a "parts version" counter that increments on any part update
Option C: Create a `useParts(messageIds)` hook that subscribes reactively

## Notes
2026-01-10: Root cause identified - getParts uses .peek() instead of reactive subscription
2026-01-10: Fix implemented:
  - Created `hooks/useParts.ts` with `usePartsForMessages()` hook that subscribes to all parts
  - Updated `MessageList.tsx` to use reactive subscription instead of non-reactive getParts
  - Build passes, types check
  - Ready for testing
