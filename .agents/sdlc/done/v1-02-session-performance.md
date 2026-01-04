# Session Loading Performance & Virtualization

## Priority: CRITICAL

## Context
Sessions are taking a long time to load. This shouldn't happen because it's all local data. If it's React rendering times, we need async virtualization and potentially simplified markdown rendering.

Reference implementation exists in Telechy/entele-forge-tauri for:
- Message virtualization
- Auto-scroll to bottom of session

## Acceptance Criteria
- [ ] Sessions load instantly (< 100ms for UI response)
- [ ] Large sessions (100+ messages) scroll smoothly
- [ ] Auto-scroll to bottom when new messages arrive
- [ ] Virtualization only renders visible messages
- [ ] No jank or frame drops when scrolling

## Technical Notes
- Reference: /Users/guilhermecastro/Projects/Telechy/entele-forge-tauri
- Investigate if delay is SDK, network, or React rendering
- Consider react-window or react-virtualized
- May need to simplify markdown renderer

## Notes
- 2026-01-04: Created as part of v1 polish effort
