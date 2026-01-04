# Hide Subagents by Default

## Priority: HIGH

## Context
By default we display all sessions including all subagents to all depths, forks, and handoffs. This is fine for one root session in focus, but displaying ALL sessions makes it extremely crowded.

Proposed behavior:
- Subagents hidden by default
- Show ACTIVE subagents when clicking/tracking a session
- Show ALL subagents if user clicks the node's subagent count button

## Acceptance Criteria
- [x] Root sessions shown by default, subagents hidden
- [x] Visual indicator on nodes showing subagent count
- [ ] Clicking a session shows its active subagents (deferred - separate feature)
- [x] Clicking subagent count expands all subagents for that session
- [x] Collapse button to hide subagents again
- [x] Graph stays clean and navigable with many sessions

## Technical Notes
- Modify tree-builder.ts to filter by depth
- Add expand/collapse state per session
- Track "active" subagents via session status

## Notes
- 2026-01-04: Created as part of v1 polish effort
- 2026-01-04: Implemented auto-collapse in useSessionGraph.ts
  - Added `userExpandedSessions` ref to track user expansions
  - Added useEffect to auto-collapse sessions with children on load
  - Modified `toggleCollapse` to track user intent (prevents re-collapse)
  - Files changed: hooks/useSessionGraph.ts
  - Visual verification: Graph now shows only root sessions by default, 
    with "+N" badges indicating hidden subagents. Clicking expand works,
    collapsed state persists during session.
