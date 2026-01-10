# Execute commands and update recents

## Context
Executing items must route server-backed commands through `executeCommand` while local actions run immediately, and recent commands should update reliably.

## Acceptance Criteria
- [x] Server commands execute via `executeCommand(sessionId, name, args)` with the selected session.
- [x] Local actions execute even when no session is selected.
- [x] Recents update after execution and are capped/deduped.
- [x] Commands requiring a session are disabled or show a clear no-session hint.

## Technical Notes
- Component breakdown: execution handler in `CommandPalette` or a dedicated hook (`useCommandPaletteActions`).
- Dependencies: `executeCommand` function, selected session context (via props from `SessionGraph` or a shared selection store).
- State management: update recent IDs on success, clear query + close palette after execution.
- Error handling: log or surface errors consistently with existing patterns (no new toast system unless already used).

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Wired palette execution with selected session context, disabled session-required commands when none selected, and kept recents updated. Files changed: components/layout/command-palette.tsx, components/layout/app-shell.tsx, components/graph/session-graph.tsx.
