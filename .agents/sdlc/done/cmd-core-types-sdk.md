# Define command core types and SDK adapters

## Context
Create a single command type that can represent SDK commands and local UI actions, and add SDK adapter helpers for listing/executing commands with consistent error handling.

## Acceptance Criteria
- [x] Extended command type captures UI metadata (category, icon, shortcut, keywords, source).
- [x] SDK adapter functions for list/execute use `wrapSdkError` and return typed results.
- [x] Command types are exported for UI consumption.

## Technical Notes
- Follow the `sessionService` pattern in `lib/opencode/sessions.ts` for error wrapping.
- Keep SDK adapters in `lib/opencode/commands.ts` and export via `lib/opencode/index.ts`.
- Prefer a `CommandDefinition` union type with explicit `source: 'sdk' | 'local'`.

## Dependencies
- None.

## Complexity
Small.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Added command types, SDK command service, and exports. Files changed: lib/opencode/client.ts, lib/opencode/commands.ts, lib/opencode/index.ts, types/commands.ts, types/index.ts.
