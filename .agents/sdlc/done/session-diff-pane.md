# Build DiffPane component with per-file sections
id: session-diff-pane

## Context
Parent: session-diff-viewer. Create a diff pane that displays session file diffs with collapsible sections and clipboard copy.

## Acceptance Criteria
- [x] AC-1: `DiffPane` renders per-file sections for a `sessionKey` using `sync.state$.data.sessionDiffs`.
- [x] AC-2: Each file section is collapsible and shows filename plus +/- counts.
- [x] AC-3: Each section renders unified diff using `PierreDiffView`.
- [x] AC-4: Copy button writes formatted diff text to clipboard and shows a lightweight success state.

## Technical Notes
- Add `components/panes/diff-pane.tsx` and export from `components/panes/index.ts`.
- Use the diff-format utility for unified diff strings and clipboard text.
- Use React Aria components or existing UI patterns for collapsible/copy controls.

## Time Estimate
2 hours

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Implemented DiffPane with Code Brutalism aesthetic. Key decisions:
- **Aesthetic**: Code Brutalism with hard edges (no border-radius on sections), monospace filenames, high contrast stats
- **Typography**: font-mono for filenames and stats, tabular-nums for alignment
- **Structure**: FileDiffSection (collapsible per-file), DiffPaneHeaderContent (stats summary), DiffPaneHeaderActions (placeholder)
- **Copy UX**: Check icon replaces Copy icon for 2 seconds on success, green highlight
- **Smart defaults**: Auto-expand if <= 3 files, collapse if more
- **Accessibility**: aria-expanded, aria-controls, aria-label, focus-visible rings
- Files changed: components/panes/diff-pane.tsx (new), components/panes/index.ts (updated exports)
- Validation: TypeScript check pass, Biome lint pass, build pass
