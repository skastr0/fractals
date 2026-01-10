# Implement useCommands hook with caching

## Context
UI needs a single hook to fetch and cache available commands for the active project, exposing loading/error state.

## Acceptance Criteria
- [x] Hook fetches SDK command list for active project directory.
- [x] Returns commands, loading/error state, and a refresh function.
- [x] Caches results per directory/server and refreshes on connection or project changes.

## Technical Notes
- Follow the state patterns in `useSessionOptions` for loading/error flow.
- Use `useOpenCode` + `useProject` to derive the directory for API calls.
- Return normalized `CommandDefinition[]` from the registry merge.

## Dependencies
- `cmd-core-types-sdk.md`.
- `cmd-core-registry.md`.

## Complexity
Medium.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Implemented `useCommands` hook with SDK fetching, registry merge, and caching. Files changed: hooks/useCommands.ts.
