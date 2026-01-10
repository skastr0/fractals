# Preload Session Previews

## Context
Session nodes show "Assistant response" as placeholder text for sessions that haven't been loaded yet. This improves UX by async-loading message content for visible sessions in the background.

## Acceptance Criteria
- [x] Create `usePreloadPreviews` hook that batches requests
- [x] Use `requestIdleCallback` for non-blocking work
- [x] Extract session keys from visible nodes
- [x] Call hook from `session-graph.tsx`
- [x] Session node reactively updates when messages load

## Implementation
- **`hooks/usePreloadPreviews.ts`**: New hook that:
  - Uses `requestIdleCallback` with 2s timeout fallback
  - Batches 5 sessions at a time with 100ms delay between batches
  - Tracks loading state to avoid duplicate requests
  - Calls `syncSession()` from SyncProvider

- **`components/graph/session-graph.tsx`**: 
  - Extracts sessionKeys from all session nodes via `useMemo`
  - Calls `usePreloadPreviews({ sessionKeys })`

- **`components/graph/session-node.tsx`**: Already had:
  - Reactive subscriptions to `state$.data.messages[sessionKey]`
  - Subscription to `state$.data.parts[lastMessageId]` for text extraction
  - `getPreviewText()` that extracts and cleans markdown text

## Notes
2025-01-05: Completed implementation. TypeScript checks pass.
