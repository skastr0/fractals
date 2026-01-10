# Build command palette data model and filtering

## Context
We need a shared data layer that merges command metadata from `useCommands()` with local UI actions, supports fuzzy search, and persists recent command usage.

## Acceptance Criteria
- [x] Palette data layer merges `useCommands()` results with local actions into a unified list.
- [x] `RECENT`, `COMMANDS`, and `ACTIONS` groups are produced deterministically.
- [x] Fuzzy filtering uses the existing `fuzzyMatch` helper and returns stable ordering.
- [x] Recents load/save from `localStorage` with SSR guards and a capped list.

## Technical Notes
- Component breakdown: new `useCommandPaletteData` hook or `lib/commands/palette.ts` utilities for list building, grouping, and filtering.
- Dependencies: `useCommands()` hook, command metadata (name, description, category, shortcut).
- State management: keep recent command IDs in local state synced to `localStorage` (`opencode-tree-ui:recent-commands`), update via pure helper functions.
- Reuse `fuzzyMatch` from `lib/graph/session-filter.ts` to avoid adding Fuse.js unless ranking needs improvement.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Added command palette data model, fuzzy filtering, and recent tracking. Files changed: lib/commands/registry.ts, hooks/useCommandPaletteData.ts, components/layout/command-palette.tsx.
