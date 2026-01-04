# P3-03 Findings - Investigate Missing Projects in List

## How OpenCode Projects Work
- OpenCode projects are registered lazily when an API request is handled with a `directory` (query or `x-opencode-directory` header). The server middleware calls `Instance.provide`, which calls `Project.fromDirectory` and writes/updates project info in storage.
- `Project.fromDirectory` discovers the repo root by walking up for `.git`. It assigns the project ID from `.git/opencode` (created if missing by taking the first root commit hash), then writes a Project record to storage and emits a `project.updated` event. It also updates `time.updated` on every access.
- If no git repo is found, the project ID is forced to `"global"` and worktree is set to `/` with fake VCS settings. That means all non-git directories collapse into a single "global" project.
- Project list is just a storage scan: `Project.list()` reads all stored projects and returns them without filtering or pagination.

## SDK Behavior (project.list)
- SDK: `project.list(parameters?: { directory?: string })` calls `GET /project` with optional `directory` query.
- Server route `/project` ignores the directory query and returns all projects from storage.
- Response is `Array<Project>` with no pagination fields. There is no pagination support in the SDK types for project list.

## Timing / Refresh Behavior
- UI only refreshes the project list on mount via `refreshProjects()` in `ProjectProvider`. There is no automatic refresh afterward.
- The only explicit refresh in the UI is after adding a project manually in `components/project-selector.tsx` (it calls `project.current({ directory })` and then `refreshProjects`).
- SSE events: the SDK defines `project.updated` as an event type, but `SyncProvider` subscribes to `/event` (instance bus) and does not handle `project.updated`. `Project.fromDirectory` emits `project.updated` on the global bus, which is exposed via `/global/event`, not `/event`.
- Result: projects created via CLI after the UI loads will not appear until a full reload or a manual refresh is triggered.

## Limitations / Edge Cases
- Project IDs are tied to the git root commit hash stored in `.git/opencode`. If multiple worktrees/clones share that hash or `.git/opencode` file, they collapse into a single project ID in storage, with the latest worktree overwriting prior entries.
- Non-git directories always map to the single `"global"` project, so multiple non-git folders will not appear separately.
- Project list is per server storage. If the CLI uses a different OpenCode server or storage location, those projects will not appear in this UI.

## Recommended Fixes
1. Add a manual refresh action in the project selector (button/icon) that calls `refreshProjects()`.
2. Subscribe to `/global/event` and trigger `refreshProjects()` on `project.updated` events (optionally debounce to avoid too many refreshes).
3. Add a lightweight polling fallback (e.g., every 30-60s while connected) if SSE isn’t available or fails.
4. Optional: show last updated timestamp or "stale" indicator when no refresh has occurred in a while.

## References
- UI project listing: `context/ProjectProvider.tsx`
- Project selector add flow: `components/project-selector.tsx`
- SSE handling: `context/SyncProvider.tsx`
- SDK project list and event types (from OpenCode repo):
  - `packages/sdk/js/src/v2/gen/sdk.gen.ts`
  - `packages/sdk/js/src/v2/gen/types.gen.ts`
- Server project registration + storage: `packages/opencode/src/project/project.ts`, `packages/opencode/src/server/project.ts`, `packages/opencode/src/server/server.ts`
