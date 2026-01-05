# Add StreamingMarkdown component

id: add-streaming-markdown-component

## Context
Breakdown from performance-and-message-rendering-overhaul to support efficient incremental markdown rendering.

## Acceptance Criteria
- [ ] AC-1: New `StreamingMarkdown` component renders partial markdown updates without layout jank.
- [ ] AC-2: Expanded text parts can swap to `StreamingMarkdown` without breaking existing markdown styles.

## Technical Notes
- New file suggestion: `components/ui/streaming-markdown.tsx`.
- Reuse `components/ui/markdown.tsx` for static rendering; add memoization/block repair for streaming text.
- Keep API aligned with `Markdown` (`content`, `className`).

## Dependencies
lazy-render-expanded-content

## Time Estimate
predicted_hours: 4
