# Fix global sessions subscription

id: fix-global-sessions-subscription

## Context
Breakdown from performance-and-message-rendering-overhaul to stop Legend State cascade re-renders triggered by global session subscriptions.

## Acceptance Criteria
- [x] AC-1: `hooks/useSessions.ts` no longer subscribes to the full sessions record; subscription scope is narrowed to the slices required by the hook.
- [x] AC-2: Session lists (root, child, filtered, archived) still update correctly when sessions are created/updated/archived.

## Technical Notes
- Target file: `hooks/useSessions.ts`.
- Replace `use$(() => state$.data.sessions.get())` with a narrower selector (e.g., session keys list + `peek()` for non-reactive reads).
- Verify consumers in `hooks/useSessionGraph.ts`, `components/session/message-list.tsx`, `components/time-filter-bar.tsx`.

## Dependencies
none

## Time Estimate
predicted_hours: 3
actual_hours: 1.0

## Notes
2026-01-04: Narrowed session subscriptions to structural or list slices; graph now uses structural subscription to avoid re-layout on non-structural updates. Files: hooks/useSessions.ts, hooks/useSessionGraph.ts.
