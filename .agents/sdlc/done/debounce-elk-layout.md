# Debounce ELK layout

id: debounce-elk-layout

## Context
Breakdown from performance-and-message-rendering-overhaul to prevent ELK layout thrash during rapid session updates.

## Acceptance Criteria
- [x] AC-1: ELK layout runs at most once per debounce window during bursts of updates.
- [x] AC-2: Layout updates correctly after the final change and positions render as expected.

## Technical Notes
- Target file: `hooks/useSessionGraph.ts` effect that calls `elk.layout`.
- Add debounce with a timer ref (`setTimeout`/`clearTimeout`) or `requestAnimationFrame` batching.
- Ensure cleanup cancels pending layout on dependency changes/unmount.

## Dependencies
none

## Time Estimate
predicted_hours: 2
actual_hours: 0.5

## Notes
2026-01-04: Added debounced ELK layout scheduling with timeout cleanup.
Files changed: hooks/useSessionGraph.ts
