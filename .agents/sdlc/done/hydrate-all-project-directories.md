# Hydrate sessions for all project directories

## Context
Option 1 requires hydration to call `session.list` for every project directory (worktree + sandboxes) so sandbox sessions are loaded. This expands `SyncProvider` hydration without changing filtering behavior.

## Acceptance Criteria
- [ ] Hydration builds a unique directory list per project (worktree + sandboxes), skipping junk directories.
- [ ] `session.list` is invoked for each directory using the existing concurrency limit.
- [ ] Initial sync populates `state$.data.sessions` with sessions from sandbox directories.

## Technical Notes
- Use `getProjectDirectories` from `lib/utils/worktree.ts` to expand directories.
- Deduplicate directories with a `Set` before running workers.
- Keep `SESSION_LIST_CONCURRENCY` and abort-signal checks intact.

## Notes
2026-01-13: Created from commit plan.
