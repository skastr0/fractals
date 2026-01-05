# Add ChainOfThought component

id: add-chain-of-thought-component

## Context
Breakdown from performance-and-message-rendering-overhaul to render reasoning parts with a specialized expanded view.

## Acceptance Criteria
- [ ] AC-1: New `ChainOfThought` component renders reasoning text plus metadata (duration, streaming state).
- [ ] AC-2: Reasoning parts use the new component when expanded and `PartPreview` when collapsed.

## Technical Notes
- Update `components/session/parts/reasoning-part.tsx` to delegate to the new component.
- Align content rendering with `StreamingMarkdown` for consistency.

## Dependencies
lazy-render-expanded-content

## Time Estimate
predicted_hours: 2
