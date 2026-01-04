# Add Session Time Filter

## Problem
Too many sessions loading, slowing rendering. Hard to find recent sessions.

## Solution
Add time-based filter, default to 24h, with controls to adjust.

## Acceptance Criteria
- [x] Default shows last 24 hours of sessions.
- [x] Time filter buttons: 1h, 6h, 24h, 7d, 30d, All.
- [x] Session count displayed (filtered/total).
- [x] Graph only renders filtered sessions.
- [x] Filter persists during session.

## Notes
- 2026-01-02: Added filter state in useSessionGraph, filtered before tree build, wired UI controls, and tests. Files: hooks/useSessionGraph.ts, components/graph/session-graph.tsx, components/graph/session-filter.tsx, lib/graph/session-filter.ts, tests/session-filter.test.ts.
