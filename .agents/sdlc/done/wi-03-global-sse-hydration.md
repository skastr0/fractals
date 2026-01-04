# WI-03 Global SSE subscription and multi-project hydration

## Context
Move from per-project SSE to the global event stream and hydrate sessions across all projects.

## Acceptance Criteria
- [x] AC-1 SyncProvider uses client.global.event() as the single SSE connection and reconnects on failure.
- [x] AC-2 On connect, project.list is used to fetch sessions for each project and populate SyncData.
- [x] AC-3 Creating a session in another project appears in the graph within one reconnect cycle without switching projects.

## Technical Notes
- Normalize { directory, payload } to the internal event handler.
- Consider batching or limiting concurrent session.list calls.
- Keep existing reconnect timing constants.

## Notes
2026-01-04: Created from commit plan.
2026-01-04: Switched to global SSE, added multi-project hydration, removed per-project session load.
Files changed: context/SyncProvider.tsx, lib/opencode/client.ts
