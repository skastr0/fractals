# Add DiffView component

id: add-diffview-component

## Context
Breakdown from performance-and-message-rendering-overhaul to render patch/diff output in a structured view.

## Acceptance Criteria
- [ ] AC-1: New `DiffView` component renders unified diff or patch data with line-level styling.
- [ ] AC-2: Patch-related parts use `DiffView` when expanded and fall back gracefully if data is missing.

## Technical Notes
- Integrate with `components/session/parts/patch-part.tsx` and/or file/tool parts.
- Keep collapsed preview unchanged; use `DiffView` only for expanded rendering.

## Dependencies
lazy-render-expanded-content

## Time Estimate
predicted_hours: 3
