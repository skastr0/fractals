# Scope parts subscription to relevant messages

## ID
PERF-001

## Context
`MessageList` uses `usePartsForMessages`, which subscribes to the entire `state$.data.parts` store so any part update re-renders the list. We need message-scoped subscriptions that only update when parts for the active session’s message IDs change.

## Time Estimate
2.5 hours

## Acceptance Criteria
- [x] `MessageList` does not re-render when parts for unrelated message IDs update (validate via React profiler or render counter).
- [x] Streaming updates for visible message parts still re-render promptly.
- [x] `usePartsForMessages` no longer subscribes to the root `state$.data.parts`; subscriptions are scoped to the current message ID list.

## Technical Notes
- Replace `usePartsForMessages` with a selector that subscribes to `state$.data.parts[messageId]` per ID and returns a stable lookup map.
- Alternatively, move part subscriptions into per-row components via `useMessageParts` and feed `flattenMessages` from cached snapshots.
- Keep the `getParts` function identity stable to avoid invalidating memoized flat items.

## Notes
2026-01-10: Created from commit plan.
2026-01-10 20:58: Scoped parts subscriptions to message IDs with stable getParts and MessageList dependency updates.
2026-01-11: Removed parts ref/effect, updated `getParts` dependency, and dropped MessageList dependency hack. Tests: `bun test`, `bun check`.

## Review Notes
2026-01-11: Review found blocking issues. See review-findings packet.
- Critical: `getParts` returns stale data due to `useEffect` updating `partsRef` after render. `MessageList` consumes `getParts` during render via `flattenMessages`.
- Fix: Remove `partsRef` and let `getParts` depend on `partsByMessage` directly.

