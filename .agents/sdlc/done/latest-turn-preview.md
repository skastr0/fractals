# Display Latest Turn Preview in Session Nodes

## Context
Session nodes should show a short preview of the latest turn to make the graph a live activity monitor without opening each session.

## Acceptance Criteria
- [x] Each session node displays a 1–2 line preview beneath the title/time in muted text with line clamping.
- [x] Preview updates when new messages or parts arrive for that session without re-rendering the entire graph.
- [x] Empty sessions show a fallback (“No messages yet”); sessions awaiting response show “Waiting for response...”.
- [x] Node height and layout are adjusted so previews never overlap controls or edges.
- [x] Performance remains stable during streaming (no noticeable lag).

## Technical Implementation Notes
- `components/graph/session-node.tsx`: derive preview using `use$` on `state$.data.messages[sessionKey]` and parts.
- `hooks/useSessionGraph.ts`: increase `NODE_HEIGHT` to accommodate preview.
- `components/graph/session-graph.tsx`: update local `nodeHeight` used for focusMostRecent.
- Use `line-clamp-2`, `text-[11px]`, and `text-muted-foreground` for styling.

## Estimated Complexity
Medium (4-6 hours)

## Dependencies
None

## Notes
2026-01-05: Created from commit plan.
2026-01-05: Added preview text to session nodes with message subscription.
