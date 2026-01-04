# Remove Unimplemented Panes & Command Center

## Priority: MEDIUM

## Context
- Config and projects panes are not implemented
- The floating "command center" menu has limited utility
- Should remove these to simplify UI and reduce confusion

Keep: Plus icon / new session button on top bar

## Acceptance Criteria
- [ ] Config pane removed or hidden
- [ ] Projects pane removed or hidden
- [ ] Floating command center menu removed
- [ ] New session button remains accessible in top bar
- [ ] No dead-end UI paths

## Technical Notes
- Review components/panes/ directory
- Check where command center is rendered
- May need to update keyboard shortcuts

## Notes
- 2026-01-04: Created as part of v1 polish effort
