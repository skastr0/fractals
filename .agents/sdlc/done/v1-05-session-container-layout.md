# Session Container Layout Fixes

## Priority: HIGH

## Context
The session pane has major layout issues:
- "You" / "Assistant" icons take over major left space
- Clicking a message has weird selection state
- Blinking cursors below user messages for some reason
- Horizontal scrolling issues depending on content

## Acceptance Criteria
- [ ] Message layout is compact and efficient
- [ ] Icons are appropriately sized (not oversized)
- [ ] No unexpected selection states when clicking messages
- [ ] No blinking cursors in inappropriate places
- [ ] No horizontal scrolling - content wraps properly
- [ ] Clean, readable message presentation

## Technical Notes
- Review message-list.tsx and message-turn.tsx
- Check CSS for overflow-x issues
- Investigate cursor/caret styling
- May need to adjust flex layout

## Notes
- 2026-01-04: Created as part of v1 polish effort
