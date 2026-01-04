# Improve Graph Layout and Spacing

## Priority: P2 - Visual Polish

## Context
The session graph looks cluttered and hard to read:
1. Nodes appear crammed together
2. Subagent group backgrounds overlap/clip badly
3. Visual hierarchy is unclear
4. Hard to distinguish parent-child relationships

## Current State

**ELK Layout Config** (from `hooks/useSessionGraph.ts`):
```tsx
const LAYOUT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  'elk.spacing.nodeNode': '40',
}
```

**Subagent Groups** (from `hooks/useSessionGraph.ts`):
```tsx
const GROUP_PADDING = 24
// Groups are created as separate nodes behind session nodes
// Uses depth-based colors for border/background
```

**Node Size**: 280x96 fixed

## Acceptance Criteria

### Layout Improvements
- [x] Increase spacing between layers (parent to child gap)
- [x] Increase spacing between sibling nodes
- [x] Groups don't overlap/clip
- [x] Clear visual flow from left to right

### Subagent Group Cleanup
- [x] Consider removing group backgrounds entirely
- [x] Or: Make groups much more subtle (lower opacity)
- [x] Ensure groups don't create visual noise
- [x] Depth colors should be subtle, not distracting

### Visual Hierarchy
- [x] Root sessions clearly distinguishable
- [x] Subagent relationship clear from edges alone
- [x] Selected node stands out clearly

## Technical Notes

**ELK Options to explore**:
```tsx
const LAYOUT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '120', // Increase from 80
  'elk.spacing.nodeNode': '60', // Increase from 40
  'elk.layered.spacing.edgeNodeBetweenLayers': '40',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
}
```

**Group simplification options**:
1. Remove `SubagentGroup` nodes entirely - rely on edges + depth accent on nodes
2. Make groups extremely subtle: `opacity: 0.05`, thinner dashed border
3. Only show groups on hover/selection

**Current depth styles** (from `lib/graph/depth-styles.ts`):
- Different colors per depth level
- Both accent color and group tint
- May be too aggressive

## Related Files
- `hooks/useSessionGraph.ts` - ELK config, group building
- `components/graph/subagent-group.tsx` - Group rendering
- `components/graph/session-node.tsx` - Node rendering
- `lib/graph/depth-styles.ts` - Color palette

## Design Decisions Needed
- Should we keep subagent groups at all?
- What's the right balance of color vs subtle?
- Do we need depth indication beyond the edge connections?

## Notes
- 2026-01-02: User reported "all clobbered, spacing is bad"
- 2026-01-02: Increased ELK spacing and softened group rendering; manual visual check recommended.
- 2026-01-02: `bun check` failed due to Biome config key `ignore`; ran `bun test` and `bun run tsc --noEmit`.
