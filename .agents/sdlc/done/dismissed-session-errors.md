# Track dismissed session errors in SyncProvider

## Context
Allow users to dismiss error banners while keeping error state for node badges and future changes.

## Acceptance Criteria
- [ ] SyncProvider stores dismissed error keys per session (e.g., `dismissedSessionErrors`).
- [ ] Dismissal hides the banner until a new error arrives or the error signature changes.
- [ ] Dismissed state clears on session deletion or when errors are cleared.

## Technical Notes
- Extend `context/SyncProvider.tsx` state with a dismissed-errors map and helper methods.
- Compute a stable error signature from `error.name` + stable `error.data` fields (stringified hash ok).
- Reset dismissal when `session.error` updates with a different signature.

## Estimated Complexity
M

## Notes
2026-01-12: Created from commit plan.
