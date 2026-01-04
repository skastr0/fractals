# WI-07 Background event noise gating

## Context
Global event streams include noisy message.part.updated events; background projects should not thrash UI state.

## Acceptance Criteria
- [x] AC-1 For sessions outside selected projects, noisy event types are ignored or coalesced.
- [x] AC-2 Opening a session triggers a full hydrate (messages + parts) so UI is correct.
- [x] AC-3 Performance remains stable when multiple background projects stream.

## Technical Notes
- Consider an allowlist of event types (session.created/updated/status) for background projects.
- Track "needsHydration" per session to prompt on-demand fetch.
- Ensure foreground sessions still receive full real-time updates.

## Notes
2026-01-04: Created from commit plan.
2026-01-04: Added background event allowlist with hydration tracking in context/SyncProvider.tsx.
