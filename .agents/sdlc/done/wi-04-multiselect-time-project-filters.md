# WI-04 Multi-select time and project filters

## Context
Time filters must be non-exclusive and project filters should apply across the global view.

## Acceptance Criteria
- [x] AC-1 SessionFilterProvider supports multiple selected time windows with default 24h selected.
- [x] AC-2 TimeFilterBar toggles multiple selections and reflects active states.
- [x] AC-3 Session graph shows only sessions matching selected project filters (or all when none) and matching the effective time window.

## Notes
2026-01-04: Created from commit plan.
2026-01-04: Added multi-select time filter state with effective window logic, updated time filter bar counts, and extended session filter tests.

