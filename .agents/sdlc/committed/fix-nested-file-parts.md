# Fix Nested/Duplicated File Part Display

## Context
The file part display in the session view shows nested/duplicated information:
1. The `PartPreview` component shows: chevron + file icon + filename (the collapsible row header)
2. When expanded, `FilePartRenderer` renders ANOTHER bordered card with file icon + filename + mime badge

This creates an ugly "box inside box" appearance where the same file info appears twice.

## Problem Analysis
- `part-item.tsx` renders `PartPreview` as the header row (always visible)
- When expanded, it renders `PartRenderer` which calls `FilePartRenderer`
- `FilePartRenderer` renders a full bordered card with icon, filename, and metadata
- Result: Duplicated file info in nested containers

## Acceptance Criteria
- [ ] File parts should NOT show duplicated icon/filename when expanded
- [ ] When collapsed: show the preview row (chevron + file icon + filename + mime badge)
- [ ] When expanded: show ONLY the additional metadata (source info like path, line range) - NOT the filename again
- [ ] Maintain visual consistency with other part types (text, tool, etc.)
- [ ] The expanded state should feel like "showing more details" not "showing nested duplicate"

## Technical Approach
Option 1: Modify `FilePartRenderer` to only show source metadata (not the file header)
Option 2: Make `FilePartRenderer` accept a prop to skip the header when used in expandable context
Option 3: In `part-item.tsx`, render something different for file parts (not the full renderer)

Recommendation: Option 1 is cleanest - the preview already shows file info, the renderer should only show expanded details.

## Files to Modify
- `components/session/parts/file-part.tsx` - Remove the header/filename display, only show source metadata
- Possibly `components/session/part-item.tsx` - Adjust expanded rendering for file parts

## Notes
2026-01-10: Created to address UI visual bug with nested file displays
