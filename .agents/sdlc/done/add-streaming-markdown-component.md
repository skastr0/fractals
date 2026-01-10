# Add StreamingMarkdown component

id: add-streaming-markdown-component

## Context
Breakdown from performance-and-message-rendering-overhaul to support efficient incremental markdown rendering.

## Acceptance Criteria
- [x] AC-1: New `StreamingMarkdown` component renders partial markdown updates without layout jank.
- [x] AC-2: Expanded text parts can swap to `StreamingMarkdown` without breaking existing markdown styles.

## Technical Notes
- New file suggestion: `components/ui/streaming-markdown.tsx`.
- Reuse `components/ui/markdown.tsx` for static rendering; add memoization/block repair for streaming text.
- Keep API aligned with `Markdown` (`content`, `className`).

## Dependencies
lazy-render-expanded-content

## Time Estimate
predicted_hours: 4

## Implementation Notes
[2026-01-04]: Implemented StreamingMarkdown component with block repair strategy.

### Files Created
- `components/ui/streaming-markdown.tsx` - New component with:
  - `repairMarkdown()` function handles unclosed code fences and inline backticks
  - Same visual styling as existing Markdown component
  - Custom memo comparison for efficient re-renders
  - `isStreaming` prop controls repair behavior

### Files Modified  
- `components/session/parts/text-part.tsx` - Updated to use StreamingMarkdown for streaming content, Markdown for static

### Key Decisions
1. **Block repair strategy**: Count code fences (```) and backticks to detect unclosed blocks, append closing markers before parsing
2. **Conditional rendering**: TextPartRenderer switches between StreamingMarkdown (during streaming) and Markdown (when complete)
3. **Shared styling**: Both components use identical prose/code block styling to ensure seamless transition

### Validation
- `bun check`: Pass (TypeScript + Biome lint)
