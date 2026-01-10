# Implement command palette modal UI with grouped list

## Context
Replace the current inline palette UI with a Dialog-based modal matching the Cmd+K spec, including grouped sections and keyboard navigation.

## Acceptance Criteria
- [x] Palette renders in a Dialog modal with search input and ESC hint.
- [x] Groups render with headers and list items show label, description, and optional shortcut.
- [x] Arrow keys move selection, Enter executes, Escape closes.
- [x] Empty state shown when no results match the query.

## Technical Notes
- Component breakdown: update `components/layout/command-palette.tsx` to use `Dialog`, `DialogContent`, and `Input` primitives.
- Keep the layout aligned with the spec: search header, section headers, and list rows with shortcut badges (`<kbd>`).
- State management: maintain `query`, `selectedIndex`, `isOpen`, and focus restoration via `useRef` for the previously focused element.
- Style with existing Tailwind tokens (border, muted-foreground, secondary) for dark theme consistency.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Implemented Dialog-based palette UI with Input, keyboard navigation, and empty state. Files changed: components/layout/command-palette.tsx.
