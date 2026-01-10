# Implement Command Bar with Keyboard Navigation

## Context
Add a command palette (Cmd+K / Cmd+P) to quickly trigger core actions via keyboard with React Aria accessibility.

## Acceptance Criteria
- [x] Cmd+K / Cmd+P opens the command bar only when global shortcuts are allowed (FocusManager area is graph/none).
- [x] Command bar supports type-to-filter, arrow key navigation, and Enter to execute commands.
- [x] Commands include: New session, Jump to latest, Switch project, Set time filter, Close most recent pane, Clear selection.
- [x] ESC closes the palette and restores focus to the previous element.
- [x] No conflicts with existing global key handlers (graph navigation remains intact).

## Technical Implementation Notes
- Add `components/layout/command-bar.tsx` (or similar) using `Dialog` + `ListBox` from React Aria.
- Attach a global keydown listener in layout/header gated by `useFocusManager().canTriggerGlobalShortcuts()`.
- Build a local command registry with label, keywords, and callback handlers.
- Wire handlers to existing contexts: `usePanes`, `useSessionFilter`, `useProject`, and expose `focusMostRecent` from `SessionGraph` (via context or callback).
- If `new-session-modal` is implemented, command should open the modal instead of creating immediately.

## Estimated Complexity
Complex (4-8 hours)

## Dependencies
- new-session-modal.md (optional: for consistent new-session flow)

## Notes
2026-01-05: Created from commit plan.
2026-01-05: Implemented CommandPalette with Cmd+K/P shortcut and command registry.
