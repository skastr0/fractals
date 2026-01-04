# P0-02 - Fix Session Messages Not Loading

## Context
When opening a session pane, messages do not load because `syncSession` is never called. The initial session list only includes metadata, so existing messages are missing until fetched.

## Acceptance Criteria
- [x] When session pane opens, messages load and display
- [x] Messages update in real-time via SSE after initial load
- [x] Parts (text, tool calls, etc.) render correctly
- [x] No duplicate fetches on re-render

## Notes
2026-01-02: Work item created from user report.
2026-01-02: Added session pane sync effect. Files changed: components/panes/session-pane.tsx.
