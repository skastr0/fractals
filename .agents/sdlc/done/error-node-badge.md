# Add error badge to session graph nodes

## Context
Surface session errors on the graph so users can spot failing sessions quickly without opening the pane.

## Acceptance Criteria
- [ ] Session nodes render an error badge when `sessionErrors[sessionKey]` exists and the error is not `MessageAbortedError` or a retryable `ApiError`.
- [ ] Badge exposes the error name in a tooltip or accessible label.
- [ ] Badge is hidden when no qualifying error exists.

## Technical Notes
- Update `components/graph/session-node.tsx` to subscribe to `state$.data.sessionErrors[sessionKey]`.
- Reuse a shared error-classification helper (new or existing in `lib/opencode/errors.ts`) so banner and badge logic stay aligned.

## Estimated Complexity
S

## Notes
2026-01-12: Created from commit plan.
