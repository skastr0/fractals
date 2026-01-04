# Investigate Missing Projects in List

## Priority: P3 - Quality of Life

## Context
User reports that some projects they're actively working on via the CLI don't appear in the project list. Need to understand how projects work in OpenCode and ensure consistency.

## User Report
"Project listing doesnt look right, it's missing projects, or I just dont understand how projects work with opencode. I cant seem to find some projects even though I'm working on them right now via the CLI"

## Investigation Tasks

### 1. Understand OpenCode Project Model
- [ ] What creates a project in OpenCode?
- [ ] Is it automatic when `opencode` is run in a directory?
- [ ] Or does it require explicit creation?
- [ ] Are projects per-server or global?

### 2. Compare CLI vs SDK
- [ ] Run CLI `opencode` in directory, check if project appears
- [ ] Check `client.project.list()` response
- [ ] Compare with CLI's project listing (if any)

### 3. Check API Parameters
- [ ] Does `project.list()` need parameters?
- [ ] Is it scoped to current server?
- [ ] Are there pagination issues?

### 4. Timing Issues
- [ ] Does project list auto-refresh?
- [ ] Is there a sync delay?
- [ ] Does SSE include project events?

## Acceptance Criteria
- [ ] Document how projects work in OpenCode
- [ ] Ensure all CLI-accessible projects appear in UI
- [ ] Add refresh mechanism if needed
- [ ] Clear error if project listing fails

## Technical Notes

**Current implementation** (`ProjectProvider.tsx`):
```tsx
useEffect(() => {
  void refreshProjects()
}, [refreshProjects])  // Only on mount/client change
```

Projects only load once on mount. No refresh, no SSE subscription.

**Potential fixes**:
1. Add manual refresh button
2. Subscribe to project SSE events (if they exist)
3. Periodic polling
4. Refresh on window focus

**SDK methods to explore**:
- `client.project.list()` - Current usage
- `client.project.current({ directory })` - Used in "add project"
- Are there events for project creation?

## Related Files
- `context/ProjectProvider.tsx`
- `lib/opencode/client.ts`

## Research Output Expected
- Document: How OpenCode projects work
- List: Any SDK limitations discovered
- Recommendation: How to ensure project parity

## Notes
- 2026-01-02: User reported missing projects
