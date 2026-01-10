# Add session data eviction in SyncProvider

## ID
PERF-006

## Context
`SyncProvider` retains all session data indefinitely, and preloading sessions can bloat memory. We need an eviction strategy for messages/parts/diffs outside the active working set.

## Time Estimate
3 hours

## Acceptance Criteria
- [ ] Session data for inactive sessions is evicted once cache limits are exceeded.
- [ ] The active session is never evicted, and evicted sessions rehydrate on access.
- [ ] Cache size or TTL is configurable and documented in code.

## Technical Notes
- Track an LRU list keyed by `sessionKey` and evict from `state$.data.messages`, `parts`, and `sessionDiffs` together.
- Add a helper to clear session-related data safely and trigger `needsHydration` when reopened.
- Coordinate eviction with preloading logic to avoid thrashing.

## Notes
2026-01-10: Created from commit plan.
