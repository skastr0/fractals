# Introduce turn-level flat item caching

## ID
PERF-002

## Context
`flattenMessages` rebuilds every `FlatItem` object on each render, even when only a subset of messages/parts changed. This churn forces extra re-renders and virtualizer re-measurement.

## Time Estimate
2.5 hours

## Acceptance Criteria
- [ ] `flattenMessages` reuses `FlatItem` objects for unchanged turns across renders.
- [ ] The flat-item list only rebuilds for turns with changed messages or parts.
- [ ] `index`, `isFirstInTurn`, and `isLastInTurn` values remain correct after caching.

## Technical Notes
- Add a cache keyed by `turnId` plus a signature of part IDs/state to know when to invalidate.
- Consider moving flattening logic into a hook that maintains a `Map<turnId, FlatItem[]>` cache.
- Ensure cached items preserve reference equality for virtualizer stability.

## Notes
2026-01-10: Created from commit plan.
