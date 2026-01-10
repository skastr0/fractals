# Add ChainOfThought component

id: add-chain-of-thought-component

## Context
Breakdown from performance-and-message-rendering-overhaul to render reasoning parts with a specialized expanded view.

## Acceptance Criteria
- [x] AC-1: New `ChainOfThought` component renders reasoning text plus metadata (duration, streaming state).
- [x] AC-2: Reasoning parts use the new component when expanded and `PartPreview` when collapsed.

## Technical Notes
- Update `components/session/parts/reasoning-part.tsx` to delegate to the new component.
- Align content rendering with `StreamingMarkdown` for consistency.

## Notes
- 2026-01-04: Added `ChainOfThought` component with streaming markdown and metadata. Updated reasoning renderer to delegate to it.
  Files changed: components/session/parts/chain-of-thought.tsx, components/session/parts/reasoning-part.tsx.

## Dependencies
lazy-render-expanded-content

## Time Estimate
predicted_hours: 2
