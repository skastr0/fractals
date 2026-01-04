# WI-02 Composite session keys and project-aware sync state

## Context
Global sessions may collide on id across projects, so state maps must be keyed by a composite session key.

## Acceptance Criteria
- [x] AC-1 SyncData maps (sessions, messages, parts, status, etc.) are keyed by a stable sessionKey derived from directory + sessionID.
- [x] AC-2 A lookup helper can resolve sessionKey -> { sessionId, directory, projectId } for API calls.
- [x] AC-3 useSessions/useSession can consume the new keys without data loss.

## Notes
2026-01-04: Created from commit plan.
2026-01-04: Added sessionKey helpers, updated SyncProvider, hooks, and graph/session components to key session state by directory + session ID. Files changed: lib/utils/session-key.ts, lib/utils/index.ts, context/SyncProvider.tsx, hooks/useSession.ts, hooks/useSessionStatus.ts, hooks/useSessions.ts, hooks/useSessionGraph.ts, lib/graph/tree-builder.ts, types/index.ts, components/layout/header.tsx, components/graph/session-graph.tsx, components/panes/session-pane.tsx, components/session/message-list.tsx, components/session/message-turn.tsx, components/session/session-input.tsx, components/session/fork-controls.tsx.

