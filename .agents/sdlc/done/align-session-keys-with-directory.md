# Align session keys with actual session directories

## Context
Session keys currently assume `project.worktree`. When hydrating across multiple directories, keys must be derived from the session's actual directory to prevent duplicates and keep filtering correct.

## Acceptance Criteria
- [ ] Hydration builds session keys using `session.directory` when present, falling back to the list directory.
- [ ] Duplicate sessions returned from multiple directories collapse to a single entry.
- [ ] Directory-based filtering (`selectedDirectories`) continues to work for sandbox sessions.

## Technical Notes
- Compute `effectiveDirectory = session.directory ?? directory`.
- Track seen keys (or session IDs if needed) before writing to `sessionsMap`.
- Keep `buildSessionKey` as the canonical key format.

## Notes
2026-01-13: Created from commit plan.
