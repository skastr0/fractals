# Fix Graph Interaction Blocked When Panes Open

## Priority: P0 - App Breaking

## Context
When a pane opens (e.g., clicking a session node), the ReactFlow graph becomes completely uninteractable - cannot pan, zoom, or click nodes. This breaks the core app functionality as users cannot navigate between sessions.

## Root Cause Analysis
In `components/layout/app-shell.tsx` (lines 46-60):
```tsx
<main className="relative flex flex-1 overflow-hidden">
  <div className="absolute inset-0" style={{ opacity: graphOpacity, width: graphWidth }}>
    <SessionGraph />
  </div>
  {hasPanes ? (
    <div className="absolute inset-0 flex justify-end">  // <-- THIS
      <PaneContainer widthOverride={workspaceWidth} />
    </div>
  ) : null}
</main>
```

The pane container uses `absolute inset-0` which creates a full-width overlay on top of the graph. Even though the pane only visually occupies part of the screen (via `widthOverride`), the container div covers the entire main area and blocks all pointer events to the graph underneath.

## Acceptance Criteria
- [x] Graph remains fully interactable (pan, zoom, node clicks) when panes are open
- [x] Clicking on graph area (not panes) should still work for node selection
- [x] Pane open/close transitions remain smooth
- [x] Keyboard navigation on graph still works when panes are open

## Technical Notes
**Solution approach**: Change the layout from overlapping absolute positioned divs to a proper flexbox split layout:

```tsx
<main className="relative flex flex-1 overflow-hidden">
  <div className="flex-1 min-w-0" style={{ opacity: graphOpacity }}>
    <SessionGraph />
  </div>
  {hasPanes ? (
    <div style={{ width: `${workspaceWidth}%` }}>
      <PaneContainer />
    </div>
  ) : null}
</main>
```

Alternatively, add `pointer-events-none` to the pane container wrapper and `pointer-events-auto` to the actual panes:

```tsx
<div className="absolute inset-0 flex justify-end pointer-events-none">
  <PaneContainer className="pointer-events-auto" />
</div>
```

## Related Files
- `components/layout/app-shell.tsx`
- `components/panes/pane-container.tsx`
- `components/graph/session-graph.tsx`

## Notes
- 2026-01-02: Issue identified during user feedback session
- 2026-01-02: Switched app shell to flex split so panes no longer overlay the graph; kept width/opacity transitions. Tests: `bun test` pass, `tsc --noEmit` pass. `bun check` fails due to existing Biome formatting issues in `.cmap/cache` and `tsconfig.json`.
