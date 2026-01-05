# Add Session Search to Top Bar

## Context
Users need a quick way to locate sessions by metadata (title/id/directory) without opening panes. Add a session search input to the header that filters the session graph.

## Acceptance Criteria
- [ ] A “Search sessions” input appears in the header alongside ProjectSelector and TimeFilterBar.
- [ ] Typing filters sessions by title, id, or directory using case-insensitive fuzzy matching.
- [ ] Search combines with time filters and project filters; clearing the search restores all sessions.
- [ ] Filtering is client-side only (no extra network calls).
- [ ] When no sessions match, the graph renders an empty state without errors.

## Technical Implementation Notes
- `components/layout/header.tsx`: add input field (with Search icon) and wire to context.
- `context/SessionFilterProvider.tsx`: add `searchTerm` + `setSearchTerm`.
- `hooks/useSessionGraph.ts`: apply search filter alongside `filterSessionsByHours`.
- Extract `fuzzyMatch` into `lib/utils` or `lib/graph/session-filter.ts` for reuse.

## Estimated Complexity
Medium (3-5 hours)

## Dependencies
None

## Notes
2026-01-05: Created from commit plan.
