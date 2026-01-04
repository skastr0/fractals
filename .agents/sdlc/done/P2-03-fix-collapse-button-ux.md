# Fix Collapse/Expand Button UX

## Priority: P2 - Visual Polish

## Context
The collapse/expand button on session nodes with children is confusing. User reported it "seems to rearrange the map on click but seems to do pretty much nothing". The button shows a chevron + users icon + child count.

## Current State

In `components/graph/session-node.tsx`:
```tsx
{hasChildren ? (
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation()
      data.onToggleCollapse?.()
    }}
    aria-label={isCollapsed ? 'Expand subagents' : 'Collapse subagents'}
    className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/60 bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm transition hover:bg-background"
  >
    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
    <Users className="h-3 w-3" />
    <span>{data.childCount}</span>
  </button>
) : null}
```

**The problem**: When clicked, `toggleCollapse` runs in `useSessionGraph.ts`, filtering out children. But:
1. Visual feedback is subtle (chevron direction change)
2. If all children are hidden, the button may be the only indication
3. Users may not understand what "collapse" means in this context

## Acceptance Criteria
- [x] Plus/minus icons instead of chevrons
- [x] Collapsed state has distinct visual style (highlighted)
- [x] Expanded state is subtle
- [x] Button purpose clearer

## Technical Notes

**Better button design options**:

Option 1: More descriptive
```tsx
<button className="...">
  {isCollapsed ? (
    <>
      <ChevronRight className="h-3 w-3" />
      <span>Show {data.childCount} subagent{data.childCount > 1 ? 's' : ''}</span>
    </>
  ) : (
    <>
      <ChevronDown className="h-3 w-3" />
      <span>Hide subagents</span>
    </>
  )}
</button>
```

Option 2: Plus/minus with count
```tsx
<button className="...">
  {isCollapsed ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
  <span>{data.childCount}</span>
</button>
```

Option 3: Badge style when collapsed
```tsx
<button className={cn(
  "...",
  isCollapsed && "bg-primary/10 border-primary/30 text-primary"
)}>
  ...
</button>
```

**Animation considerations**:
- ReactFlow supports animated edge changes
- Node removal/addition can be animated with CSS
- ELK relayout will cause position jumps - may need transition

## Related Files
- `components/graph/session-node.tsx`
- `hooks/useSessionGraph.ts` - toggleCollapse logic

## Notes
- 2026-01-02: User confused about button purpose, reported it "does nothing"
- 2026-01-02: Updated button to plus/minus icons with highlighted collapsed state and clearer aria-labels in `components/graph/session-node.tsx`. Tests: `bun test` pass. `bun check` fails due to Biome config error (unknown key `ignore` in `biome.json`).

## Blockers
- 2026-01-02: `bun check` fails because `biome.json` uses unknown key `ignore` under `files`.
