# Graph Navigation & Session Sorting

## Priority: HIGH

## Context
In projects with dozens or hundreds of sessions it's hard to navigate. The sorting/laying out of sessions isn't clear or obvious, so users don't know where to look to find recent sessions.

## Acceptance Criteria
- [ ] Most recent sessions are visually prominent (top or highlighted)
- [ ] Clear visual grouping by time (today, yesterday, this week, older)
- [ ] Session layout has clear logic users can understand
- [ ] Can quickly find the most recent session
- [ ] Adequate spacing between session groups

## Technical Notes
- Current layout uses Dagre algorithm
- May need custom layout or sorting before Dagre
- Consider time-based vertical positioning
- Add visual separators between time groups

## Notes
- 2026-01-04: Created as part of v1 polish effort
