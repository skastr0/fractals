# Add CodeBlock with lazy Shiki

id: lazy-shiki-codeblock

## Context
Breakdown from performance-and-message-rendering-overhaul to keep syntax highlighting fast by loading Shiki lazily.

## Acceptance Criteria
- [x] AC-1: Code blocks render a fast fallback before Shiki loads.
- [x] AC-2: Shiki is imported lazily and only used in expanded content.

## Technical Notes
- Update `components/ui/markdown.tsx` or add a dedicated code block component for `StreamingMarkdown`.
- Use dynamic import and memoized theme setup to avoid blocking render.
- Ensure no highlight work happens for collapsed rows.

## Dependencies
add-streaming-markdown-component

## Time Estimate
predicted_hours: 3

## Notes
2026-01-04: Added lazy Shiki code blocks with fallback rendering. Streaming markdown disables highlighting while streaming. Files changed: components/ui/markdown.tsx, components/ui/streaming-markdown.tsx, package.json, bun.lock.
