# Filter Junk Projects from List

## Priority: P3 - Quality of Life

## Context
The project list shows test projects from `/private/vars` and other system paths that users don't want to see. Need to filter these out or provide configuration.

## Current State

In `context/ProjectProvider.tsx`:
```tsx
const refreshProjects = useCallback(async () => {
  const result = await client.project.list()
  const projects = (result.data ?? []).slice().sort((a, b) => b.time.updated - a.time.updated)
  state$.projects.set(projects)
}, [client, state$])
```

All projects returned by the SDK are shown without filtering.

## Questions to Investigate
1. Does OpenCode SDK have a way to filter projects?
2. Can we pass a filter to `client.project.list()`?
3. Is there configuration in opencode.json to exclude paths?
4. Are these test projects from OpenCode's own tests?

## Acceptance Criteria
- [x] Common junk paths filtered by default
- [ ] OR: Configuration option to define exclude patterns
- [ ] OR: "Hide" capability per-project (stored in localStorage)

## Options

### Option 1: Hardcoded exclude patterns
```tsx
const EXCLUDE_PATTERNS = [
  /^\/private\/var/,
  /^\/var\/folders/,
  /^\/tmp\//,
  /node_modules/,
]

const filteredProjects = projects.filter(p => 
  !EXCLUDE_PATTERNS.some(pattern => pattern.test(p.worktree))
)
```

### Option 2: Local hide list
```tsx
const hiddenProjectIds = localStorage.getItem('hidden-projects') 
  ? JSON.parse(localStorage.getItem('hidden-projects'))
  : []

const filteredProjects = projects.filter(p => !hiddenProjectIds.includes(p.id))
```

### Option 3: SDK-level filtering (if supported)
```tsx
const result = await client.project.list({ 
  exclude: ['/private/var', '/tmp'] 
})
```

## Technical Notes

**Implementation location**: `context/ProjectProvider.tsx` in `refreshProjects`

**User preference storage**:
- Already using localStorage for last project
- Can extend for hidden projects list

**Consider**: Show count of hidden projects with option to "show all"

## Related Files
- `context/ProjectProvider.tsx`
- `components/project-selector.tsx`

## Research Tasks
1. Check if issue is from OpenCode server or SDK
2. Test what paths are actually being returned
3. Check OpenCode docs for project filtering

## Notes
- 2026-01-02: User seeing "test projects from /private/vars"
- 2026-01-02: Added worktree exclude patterns and filtering in `context/ProjectProvider.tsx`. `bun test` passed; `bun check` fails due to existing Biome config error (`biome.json` unknown key `ignore`).

## Blockers
- 2026-01-02: `bun check` fails because `biome.json` uses unsupported key `files.ignore` (unrelated to this change). Needs config fix or updated Biome settings.
