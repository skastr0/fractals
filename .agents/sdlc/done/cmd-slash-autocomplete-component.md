# Build slash command autocomplete list component

## Context
Create a reusable command list component for the inline slash autocomplete UI, as defined in the commit plan. Consumes command data (from `useCommands()`) and renders accessible menu rows with description.

## Acceptance Criteria
- [x] Renders command rows with name and description in dark theme styling.
- [x] Provides loading and empty states with accessible text.
- [x] Supports keyboard focus/active row styling and mouse hover/click selection via a provided `onSelect`.
- [x] Exposes props for `commands`, `activeIndex`, and `onActiveChange` (or equivalent) to integrate with session input state.
- [x] Uses React Aria menu/listbox patterns (`components/ui/menu.tsx`) for roles and focus management.

## Technical Notes
- Depends on `useCommands()` to supply command data, but accepts commands as props for testability.
- Use `components/ui/menu.tsx` items if possible; add minimal wrapper in `components/session/command-autocomplete.tsx`.
- Ensure `aria-label` or `aria-labelledby` for the list and rows.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Added command autocomplete list component with Menu-based rows, active styling, and loading/empty states. Files: `components/session/command-autocomplete.tsx`.
