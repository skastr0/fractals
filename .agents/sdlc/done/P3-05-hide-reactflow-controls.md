# Hide or Restyle ReactFlow Controls

## Priority: P3 - Quality of Life

## Context
The ReactFlow zoom/pan controls in the corner "look awful" according to user feedback. They clash with the app's design and add visual noise.

## Current State

In `components/graph/session-graph.tsx`:
```tsx
<ReactFlow ...>
  <Background color="hsl(var(--border))" gap={20} size={1} />
  <Controls className="!bg-background !border-border" />  // <-- These
</ReactFlow>
```

Controls component renders zoom in/out/fit buttons with default ReactFlow styling, partially overridden with `!important` classes.

## Acceptance Criteria

### Option A: Hide Controls
- [x] Remove Controls component entirely
- [x] Document keyboard/trackpad alternatives:
  - Scroll to zoom
  - Drag to pan
  - Cmd/Ctrl+0 to fit (if implemented)

### Option B: Restyle Controls
- [ ] Match app's visual design
- [ ] Subtle, non-intrusive appearance
- [ ] Proper dark mode support
- [ ] Consider moving to different position

### Option C: Custom Controls
- [ ] Build custom control buttons
- [ ] Integrate into UI (e.g., in header or floating toolbar)
- [ ] Better icons and styling

## Technical Notes

**Hide controls**:
```tsx
<ReactFlow ...>
  <Background ... />
  {/* Remove <Controls /> */}
</ReactFlow>
```

**Custom styling**:
```tsx
<Controls 
  className="!bg-background/80 !border-border !rounded-lg !shadow-md"
  showZoom={true}
  showFitView={true}
  showInteractive={false}
/>
```

**Custom controls component**:
```tsx
function GraphControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  
  return (
    <div className="absolute bottom-4 left-4 flex gap-1 rounded-lg border bg-background p-1">
      <Button size="icon" variant="ghost" onPress={() => zoomIn()}>
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onPress={() => zoomOut()}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onPress={() => fitView()}>
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

## Related Files
- `components/graph/session-graph.tsx`

## Notes
- 2026-01-02: User reported controls "look awful"
- 2026-01-02: Removed ReactFlow Controls import/component; documented zoom/pan alternatives in this work item.
