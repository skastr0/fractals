# Session Pane UI Overhaul

## Context
Major UI improvements needed for the session pane based on user feedback.

## Work Items

### 1. Fix Non-Clickable Rows
Some tool parts like Type_diagnostics don't respond to clicks. All tool parts should be collapsible.
- Check `part-item.tsx` - tool parts ARE clickable
- Issue might be in how some tool outputs render

### 2. Simplify Assistant Header  
- Remove Bot icon avatar
- Remove "Assistant" text
- Show agent name prominently with its color (from AgentColorProvider)
- Keep model info secondary
- Keep finish badge

### 3. Fix Duplicated Icons in Patch Parts
The patch part shows a header row with icon AND the expanded content shows another icon.
- Modify `patch-part.tsx` to not duplicate info already in preview

### 4. Remove Blinking Cursor Remnants
- Remove the blinking cursor from `text-part.tsx`
- Streaming is already indicated by green dot in preview

### 5. Change Default Expand State
In `message-list.tsx`, modify `isExpanded` logic:
- Default: collapsed
- Exceptions: diffs/patches expanded by default, agent responses expanded

### 6. Implement Beautiful Diff Rendering
Install and use `@pierre/diffs` library:
- `bun add @pierre/diffs`
- Use `PatchDiff` component for unified diffs
- Use `FileDiff` for file comparisons
- Configure with dark theme

### 7. Improve Markdown Rendering
Based on research:
- Use `react-markdown` with proper `components` override
- Add `@tailwindcss/typography` prose classes
- Better code block rendering with copy button
- Use `remark-gfm` for GitHub-flavored markdown

## Research Findings

### @pierre/diffs Library
```tsx
import { PatchDiff } from '@pierre/diffs/react'

// For unified diff patches:
<PatchDiff 
  patch={diffString}
  options={{
    theme: 'github-dark', // or custom theme
    layout: 'stacked', // or 'split'
    changeStyle: 'bars', // 'classic', 'none'
    enableInlineHighlight: true,
    enableWrapping: true,
  }}
/>
```

### Markdown Improvements
- Use `react-markdown` with `remark-gfm`
- Memoize with `React.memo` for streaming performance
- Custom `CodeBlock` component with copy button
- Base styles from `@tailwindcss/typography`

## Notes
2026-01-10: Created for comprehensive session pane UI fixes
