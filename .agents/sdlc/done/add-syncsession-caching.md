# Add caching to syncSession

id: add-syncsession-caching

## Context
Breakdown from performance-and-message-rendering-overhaul to avoid redundant message fetches when opening the same session repeatedly.

## Acceptance Criteria
- [x] AC-1: `syncSession` skips network fetch when messages are already hydrated and not marked stale.
- [x] AC-2: When a session is marked for hydration or missing messages, `syncSession` fetches and updates state.

## Technical Notes
- Target file: `context/SyncProvider.tsx` around `syncSession`.
- Use a per-session cache (`lastSyncAt` map or `needsHydration` flag) to gate refetches.
- Use `peek()` reads for cache checks to avoid extra subscriptions.

## Dependencies
none

## Time Estimate
predicted_hours: 2
actual_hours: 1

## Notes
2026-01-04: Added syncSession cache guard with needsHydration + force and tests for fetch gating.
