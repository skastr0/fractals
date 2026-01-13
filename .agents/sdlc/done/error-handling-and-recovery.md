# Error Handling and Recovery Features

## Context
Currently the OpenCode Tree UI doesn't display errors from the OpenCode SDK, nor indicate at the node level when a session is in an errored state. Users also don't have access to revert/undo commands that the OpenCode SDK may support. This makes debugging and recovery difficult.

## Goals
1. Show errors from the OpenCode SDK to users
2. Allow errors to be dismissed (with consideration for undismissable critical errors)
3. Show nodes in errored state visually until dismissed
4. Implement revert/undo functionality if available in SDK
5. Investigate other self-healing mechanisms available to users

## Acceptance Criteria
- [x] Errors from SDK are captured and displayed to users
- [x] Error dismissal mechanism exists
- [x] Nodes show visual error state
- [x] Critical errors cannot be dismissed (if applicable)
- [x] Revert/undo commands work if SDK supports them
- [x] Any other recovery mechanisms are surfaced

## Notes
2026-01-12: Created work item, starting exploration of OpenCode SDK capabilities
2026-01-12: Completed implementation with:
- Error classification system (hidden/critical/dismissable)
- Session node error badges with severity-based styling
- Session error banner component with dismiss controls
- Session retry banner showing auto-retry status
- Abort-first undo/redo pattern for recovery
- Dismissed errors state management in SyncProvider
