# WI-05 Project labels on session nodes

## Context
Each session node must display the project name/path to avoid ambiguity in the global view.

## Acceptance Criteria
- [x] AC-1 SessionNodeData includes a projectLabel derived from session.directory or project metadata.
- [x] AC-2 SessionNode renders the project label with truncation and tooltip.
- [x] AC-3 If project metadata is missing, a fallback label uses the directory basename.

## Technical Notes
- Add formatting helper (name + short path) used by ProjectSelector to keep consistent.
- Keep label small and secondary to session title/time.

## Notes
2026-01-04: Created from commit plan.
2026-01-04: Added project label formatting helper and session node labels.
Files changed: lib/utils/project-label.ts, lib/utils/index.ts, components/project-selector.tsx, components/project-info.tsx, hooks/useSessionGraph.ts, lib/graph/tree-builder.ts, components/graph/session-node.tsx, types/index.ts.
