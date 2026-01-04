# Remove/Simplify Subagent Depth Labels

## Priority: P2 - Visual Polish

## Context
Session nodes display a prominent "SUBAGENT DEPTH 1" label that takes up valuable space and provides little useful information. Users report these are "huge" and "mostly useless".

## Current State

In `components/graph/session-node.tsx`:
```tsx
{data.isSubagent ? (
  <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground">
    Subagent depth {data.depth}
  </span>
) : null}
```

This appears on every subagent node, taking horizontal space in the metadata line.

## Acceptance Criteria
- [x] Remove "SUBAGENT DEPTH N" label from nodes
- [x] Subagent status still indicated via existing visual cues:
  - Left border accent color
  - `bg-secondary/5` background
  - Edge connections to parent
- [ ] Or: Replace with much smaller indicator (icon only, no text)

## Technical Notes

**Option 1: Remove entirely**
```tsx
// Just delete the span, rely on border-l-4 + color
```

**Option 2: Subtle icon indicator**
```tsx
{data.isSubagent ? (
  <Layers className="h-3 w-3 text-muted-foreground" title={`Depth ${data.depth}`} />
) : null}
```

**Option 3: Compact badge**
```tsx
{data.isSubagent ? (
  <span className="text-[9px] text-muted-foreground">D{data.depth}</span>
) : null}
```

**Current visual indicators that remain**:
- `border-l-4` colored accent for subagent nodes
- `bg-secondary/5` subtle background tint
- Group backgrounds (if kept)
- Edge connections

## Related Files
- `components/graph/session-node.tsx`

## Notes
- 2026-01-02: User reported "huge indicators of SUBAGENT DEPTH 1 that are mostly useless"
- 2026-01-02: Removed subagent depth label in `components/graph/session-node.tsx`. Tests: `bun test` pass; `bun check` fails due to existing biome format issues in `.cmap/cache`.
