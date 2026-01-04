# Feedback Round: User Testing Session 2026-01-02

## Summary

User testing of the OpenCode Tree UI MVP revealed several critical issues and improvement opportunities. Work items have been created across 4 priority levels.

## Priority Classification

### P0 - App Breaking (Must Fix)
These issues prevent the app from being usable:

| ID | Issue | Root Cause |
|----|-------|------------|
| P0-01 | Graph freezes when pane opens | Pane container overlays entire viewport with `absolute inset-0` |
| P0-02 | Session messages don't load | `syncSession` never called when pane opens |

### P1 - Core Functionality (Essential)
These features are needed for the app to be useful:

| ID | Issue | Notes |
|----|-------|-------|
| P1-01 | Session pane incomplete | Messages, parts, metadata display |
| P1-02 | Input controls missing | Agent/model selection, file attachments |

### P2 - Visual Polish (Important)
These issues affect usability and perception:

| ID | Issue | Notes |
|----|-------|-------|
| P2-01 | Graph layout cluttered | Spacing, group backgrounds clipping |
| P2-02 | Subagent depth labels | "SUBAGENT DEPTH N" too prominent |
| P2-03 | Collapse button confusing | Users don't understand what it does |
| P2-04 | Redundant project header | Duplicates selector info |
| P2-05 | Session ordering unclear | Appears random, hard to find sessions |

### P3 - Quality of Life (Nice to Have)
These improve the experience but aren't blocking:

| ID | Issue | Notes |
|----|-------|-------|
| P3-01 | Project picker crude | No fuzzy search |
| P3-02 | Junk projects showing | /private/vars test projects |
| P3-03 | Missing projects | Some CLI projects don't appear |
| P3-04 | Next.js debug badge | Distracting "N" indicator |
| P3-05 | ReactFlow controls ugly | Default styling clashes |

## Suggested Execution Order

### Phase 1: Unblock Core Experience
1. **P0-01**: Fix graph interaction (layout change)
2. **P0-02**: Fix message loading (call syncSession)

### Phase 2: Make Session Pane Useful
3. **P1-01**: Session pane full implementation
4. **P1-02**: Input controls enhancement

### Phase 3: Visual Cleanup
5. **P2-02**: Remove subagent depth labels (quick win)
6. **P2-04**: Remove project header (quick win)
7. **P2-01**: Graph layout improvements
8. **P2-03**: Collapse button UX
9. **P2-05**: Session ordering

### Phase 4: Polish
10. **P3-04**: Hide Next.js debug (quick win)
11. **P3-05**: Hide/restyle ReactFlow controls (quick win)
12. **P3-01**: Project picker fuzzy search
13. **P3-02**: Filter junk projects
14. **P3-03**: Investigate missing projects

## Dependencies

```
P0-02 (messages load) ─┬─> P1-01 (session pane)
                       └─> P1-02 (input controls)

P0-01 (graph interaction) ─> All visual polish items
```

## Technical Notes

### Root Cause: Layout Architecture
The app-shell layout uses absolute positioning for both graph and pane containers, causing overlap issues. Consider refactoring to flexbox:

```tsx
<main className="flex flex-1 overflow-hidden">
  <div className="flex-1 min-w-0">{/* Graph */}</div>
  <div style={{ width }}>{/* Panes */}</div>
</main>
```

### Root Cause: Data Loading Pattern
SSE subscription handles real-time updates but not initial data load. Each component that needs data should trigger sync on mount.

## Raw Feedback Captured

> "critical issue: the react flow map must always be interactable. right now once we open a pane it freezes the map"

> "the graph is all clobbered, the spacing is bad. It's hard to see what's going on because the way we group sessions is creating these background colors / elements that are clipping each other"

> "big project header that's useless, we already have project info in the select"

> "When clicking a session, nothing renders at all. No messages, no nothing"

> "nodes have these huge indicators of SUBAGENT DEPTH 1 that are mostly useless"

> "The little person + number arrow / button below a session node seems to rearrange the map on click but it seems to do pretty much nothing"

> "the sessions seem to be all over the place!"

> "Project picker is crude, we must improve it with local fuzzy search"

> "keeps showing all of these test projects from /private/vars"

> "project listing doesnt look right, it's missing projects"

> "how can we remove the nextjs debug thing? Its useless and noisy. Also the react flow controls crap, it looks awful"
