# Wire global shortcut handling and mounting

## Context
The palette must be globally accessible via Cmd/Ctrl+K and mounted once at the app shell level.

## Acceptance Criteria
- [x] Cmd/Ctrl+K opens/closes the palette and restores focus on close.
- [x] Palette is mounted once in `AppShell` (no duplicate listeners).
- [x] Legacy `SessionGraph` palette wiring is removed or refactored.
- [x] Shortcut handling respects `FocusManager.canTriggerGlobalShortcuts`.

## Technical Notes
- Component breakdown: move palette mount to `components/layout/app-shell.tsx` and remove from `components/graph/session-graph.tsx`.
- Global keydown handler should live inside the palette component and guard when focus is in inputs or dialogs.
- Keep optional support for Cmd+P only if explicitly approved; otherwise restrict to Cmd+K/Ctrl+K.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Mounted the command palette in AppShell, registered graph actions, removed SessionGraph wiring, and tightened the global Cmd/Ctrl+K handler. Files changed: components/layout/app-shell.tsx, components/layout/command-palette.tsx, components/graph/session-graph.tsx.
