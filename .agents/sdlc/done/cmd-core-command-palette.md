# Wire command palette to core registry

## Context
The existing command palette uses inline command definitions; it should use the shared registry and executor to align with slash commands.

## Acceptance Criteria
- [x] Command palette sources commands from the shared registry and hook.
- [x] Filtering uses command keywords/description from the registry.
- [x] Command execution routes through the new executor while preserving existing actions.

## Technical Notes
- Keep palette-specific query/selection UI, but replace inline command list with registry output.
- Inject palette-specific actions (new session, clear selection, filter toggles) via local command definitions.
- Preserve global shortcut handling (⌘K/⌃K).

## Dependencies
- `cmd-core-use-commands.md`.
- `cmd-core-execution.md`.

## Complexity
Medium.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Wired command palette to use `useCommands` registry output and `useCommandExecutor`, added loading/empty state messaging. Files changed: components/layout/command-palette.tsx.
