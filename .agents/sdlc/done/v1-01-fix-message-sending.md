# Fix Broken Message Sending

## Priority: CRITICAL

## Context
Currently starting a session / empty session is totally not implemented, and sending messages to sessions is broken. This is a critical issue because it means users can't actually use the app to send messages to opencode.

## Acceptance Criteria
- [ ] Can create a new empty session
- [ ] Can type a message in the session input
- [ ] Can send message and see it appear in the session
- [ ] Can receive assistant responses via SSE
- [ ] Error states are handled gracefully

## Technical Notes
- Need to investigate current session-input.tsx implementation
- Check OpenCode SDK for session.chat() or equivalent API
- Verify SSE subscription is working for message updates

## Notes
- 2026-01-04: Created as part of v1 polish effort
