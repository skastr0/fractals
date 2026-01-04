# Session Input Options

## Priority: MEDIUM

## Context
The session input is missing critical options:
- Mode selection (agent mode, etc.)
- Model selection
- Thinking parameters selection
- File upload (needs verification)

## Acceptance Criteria
- [x] Can select agent mode before/during session
- [x] Can select model from available models
- [x] Can configure thinking parameters
- [x] File upload works (if supported by SDK)
- [x] Options are accessible but not intrusive
- [x] Selections persist appropriately

## Technical Notes
- Review session-input.tsx
- Check OpenCode SDK for available options
- Reference OpenCode TUI for feature parity

## Notes
- 2026-01-04: Created as part of v1 polish effort
- 2026-01-04: COMPLETED - All options implemented in session-input.tsx using useSessionOptions hook
