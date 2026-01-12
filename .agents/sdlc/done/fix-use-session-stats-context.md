# Fix useSessionStats context calculation

## Context
Align `tokens.currentContext` with OpenCode TUI semantics by using the latest assistant message total tokens (input + output + reasoning + cache read/write), so downstream stats render correctly.

## Acceptance Criteria
- [x] `tokens.currentContext` equals the latest assistant total tokens (input + output + reasoning + cache.read + cache.write).
- [x] When no assistant messages exist, `tokens.currentContext` returns 0.
- [x] Existing `SessionStats` consumers continue to compile without interface changes.
- [x] Aggregated token totals/costs remain unchanged except for `currentContext`.

## Technical Notes
- Compute the latest assistant token total with null-safe defaults.
- Keep `tokens.currentContext` derived from the latest assistant message only.
- Consider adding a small helper for context token calculation to reuse elsewhere.

## Notes
2026-01-11: Created from commit plan.
2026-01-11: Updated currentContext to use total tokens; added tests for latest assistant totals.
Files changed: hooks/useSessionStats.ts, tests/use-session-stats.test.ts
