# Wire command selection, argument hints, and execution

## Context
After a command is selected from autocomplete, update the input value, show argument hints, and execute via `executeCommand` on submission.

## Acceptance Criteria
- [x] Selecting a command populates the input with `/${command}` and positions the cursor after the name.
- [x] Argument hints render when the selected command includes `template` or `hints` (placement defined in plan).
- [x] Enter executes `executeCommand(sessionId, name, args)` when in command mode and a command is selected.
- [x] Enter submits normal text when not in command mode.
- [x] No command is executed when selection is missing; in that case input remains editable.

## Technical Notes
- Dependencies: `executeCommand(sessionId, name, args)`, `parseCommandInput(text)`, work items `cmd-slash-autocomplete-component.md` and `cmd-slash-input-integration.md`.
- Use `parseCommandInput` to split name/args and keep argument parsing aligned with core infra.
- Clearing behavior should match existing message submit flow (confirm current behavior before wiring).

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Wired session input command execution, added command hints/error display, and updated enter handling in `components/session/session-input.tsx`.
