# Add Folder Icon to Project Button

## Context
The add-project button in the header uses a Plus icon, which clashes with the New Session button. Swap to a folder icon to better represent project selection.

## Acceptance Criteria
- [ ] The add-project button uses a folder-style icon (Folder or FolderOpen) instead of Plus.
- [ ] Icon size, alignment, and button hit-area remain unchanged.
- [ ] The New Session button continues to use the Plus icon (no ambiguity).
- [ ] No new dependencies; icon sourced from `lucide-react`.

## Technical Implementation Notes
- `components/project-selector.tsx`: replace `<Plus />` in the add-project button with `<Folder />` or `<FolderOpen />` and update imports.

## Estimated Complexity
Simple (< 1 hour)

## Dependencies
None

## Notes
2026-01-05: Created from commit plan.
