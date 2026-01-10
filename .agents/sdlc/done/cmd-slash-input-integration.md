# Integrate slash autocomplete trigger in session input

## Context
Extend `components/session/session-input.tsx` to detect command input with `parseCommandInput`, manage popover open/close state, and wire filtered command data into the autocomplete component.

## Acceptance Criteria
- [x] Typing `/` in the input opens the autocomplete popover anchored to the input; closing happens on Escape or when not in command mode.
- [x] Input changes filter the command list (case-insensitive prefix/contains match).
- [x] Arrow keys move active selection only when the popover is open; normal cursor movement works otherwise.
- [x] Tab autocompletes the highlighted command name without executing.
- [x] Loading state shows while `useCommands()` is fetching; empty state shows when no matches.
- [x] Mouse interactions (hover/click) update selection and keep input focus consistent.

## Technical Notes
- Dependencies: `useCommands()`, `parseCommandInput(text)`, `components/ui/popover.tsx`, `components/ui/menu.tsx`.
- Gate all keyboard overrides on `isCommandMode` to avoid interfering with normal message input.
- Track state for `isOpen`, `query`, `activeIndex`, and `filteredCommands`.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Wired slash command autocomplete state, filtering, and popover rendering in `components/session/session-input.tsx`.

2026-01-10: Review found blocking issue. Autocomplete popover opens downwards and is clipped by the session pane. Needs to open upwards.
2026-01-10: Updated popover positioning to open upward with `bottom-full` + `mb-2`.
