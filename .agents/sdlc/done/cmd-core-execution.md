# Create command execution wrapper

## Context
Command execution should be centralized so slash commands and palette actions share loading/error behavior and dispatch logic.

## Acceptance Criteria
- [x] Executor dispatches local vs SDK commands with a consistent return shape.
- [x] Tracks loading/error state for UI usage.
- [x] Supports session-aware commands via session key or ID resolution.

## Technical Notes
- Use `parseSessionKey` for sessionKey → sessionID resolution.
- Prefer a hook (`useCommandExecutor`) that returns `executeCommand`, `isExecuting`, `error`.
- SDK commands should call `client.session.command` with `{ name, args }` and project directory.

## Dependencies
- `cmd-core-registry.md`.
- `cmd-core-parser.md`.

## Complexity
Medium.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Implemented command executor hook with session-aware SDK dispatch and command service support. Files changed: hooks/useCommandExecutor.ts, lib/opencode/commands.ts.
