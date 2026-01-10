# Add command input parser utility

## Context
Slash command input needs a parser that extracts a command name and arguments without UI-specific coupling.

## Acceptance Criteria
- [x] Parser returns structured output (name, args, raw input, isCommand).
- [x] Handles leading slash, whitespace, and quoted arguments.
- [x] Unit tests cover common and edge cases.

## Technical Notes
- Implement as a pure utility in `lib/commands/parse-command.ts`.
- Preserve raw input for diagnostics and UI hints.
- Use a small, predictable quoting rule set (double quotes + escape). 

## Dependencies
- `cmd-core-types-sdk.md`.

## Complexity
Small.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Implemented parser utility with tests. Files: lib/commands/parse-command.ts, lib/commands/index.ts, tests/parse-command.test.ts.
