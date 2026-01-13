# Render session error banner with dismiss

## Context
Provide a session-level banner with guidance and dismiss controls when a non-retryable error occurs.

## Acceptance Criteria
- [ ] Banner appears above the message list when the current session has a non-dismissed error.
- [ ] `MessageAbortedError` never shows; retryable `ApiError` only surfaces via retry status.
- [ ] `ProviderAuthError` banner is not dismissable and includes auth guidance.
- [ ] `UnknownError` and `MessageOutputLengthError` banners include dismiss action and hint text.
- [ ] Banner hides when dismissed or when the error clears/changes.

## Technical Notes
- Render banner in `components/panes/session-pane.tsx` or `components/session/message-list.tsx` (new `components/session/session-error-banner.tsx` if cleaner).
- Use existing UI primitives (`Button`, `StatusDot`, etc.) and the shared error-classification helper.
- Wire dismiss action to SyncProvider dismissed-error state.

## Estimated Complexity
M

## Notes
2026-01-12: Created from commit plan.
