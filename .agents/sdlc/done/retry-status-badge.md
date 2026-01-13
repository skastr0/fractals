# Add retry status badge in session UI

## Context
Expose `session.status=retry` to communicate automatic retry countdowns at a glance.

## Acceptance Criteria
- [ ] Session nodes show a compact retry badge when status is `retry`.
- [ ] Session pane header shows a retry badge (reuse `SessionStatusBadge` if possible).
- [ ] Badge is hidden for non-retry statuses.

## Technical Notes
- Reuse `components/ui/session-status-badge.tsx` or a compact variant.
- Subscribe to status via `useSessionStatus` or `state$.data.sessionStatus`.

## Estimated Complexity
S

## Notes
2026-01-12: Created from commit plan.
