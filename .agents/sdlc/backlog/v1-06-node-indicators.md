# Session Node Indicators

## Priority: MEDIUM

## Context
Session nodes should have indicators to show importance at a glance:
- Number of user messages
- Number of subagents
- Lines added/removed (code diff)

This helps users identify which nodes are bigger and more important. Some UI for this exists but can be improved.

## Acceptance Criteria
- [ ] Node shows user message count
- [ ] Node shows subagent count (clickable to expand)
- [ ] Node shows code diff summary (+/- lines)
- [ ] Indicators are compact and don't clutter the node
- [ ] Visual hierarchy makes important sessions stand out

## Technical Notes
- Review session-node.tsx for existing indicators
- May need to fetch additional session metadata
- Consider color coding or size variations

## Notes
- 2026-01-04: Created as part of v1 polish effort
