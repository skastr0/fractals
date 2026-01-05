# Lazy render expanded content

id: lazy-render-expanded-content

## Context
Breakdown from performance-and-message-rendering-overhaul to keep heavy markdown/code rendering offscreen until expanded.

## Acceptance Criteria
- [x] AC-1: Collapsed items render only `PartPreview` (no markdown/diff/code rendering).
- [x] AC-2: Expanded items render full content and trigger virtualizer re-measurement.

## Notes
2026-01-04: Replaced JSON placeholder with `PartRenderer` component in `part-item.tsx`.
- Import added: `import { PartRenderer } from './part-renderer'`
- Content now renders using existing part renderers (text, tool, file, patch, etc.)
- Lazy loading maintained: `PartRenderer` only mounts when `isExpanded` is true
- Virtualizer re-measurement handled by parent wrapper in `message-list.tsx` via `ref={virtualizer.measureElement}`
- Files changed: `components/session/part-item.tsx`

## Technical Notes
- Branch on expansion state inside `PartItem`.
- Use `virtualizer.measureElement` for expanded content containers.
- Keep heavy components isolated to expanded branch.

## Dependencies
implement-expand-collapse-state

## Time Estimate
predicted_hours: 3
