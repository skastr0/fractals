# Abort-first undo/redo controls

## Context
Undo/redo must abort active sessions before revert/unrevert to match OpenCode semantics.

## Acceptance Criteria
- [ ] Undo and redo call `sessionService.abort()` when session status is not idle before revert/unrevert.
- [ ] Actions use `sessionService.revert`/`sessionService.unrevert` instead of direct SDK calls.
- [ ] Buttons remain disabled while an action is in-flight or not allowed.

## Technical Notes
- Update `components/session/fork-controls.tsx` `RevertControls` to reference `sessionService` and session status.
- Use `useSessionStatus` or `useSession` to read live status and decide when to abort.

## Estimated Complexity
M

## Notes
2026-01-12: Created from commit plan.
