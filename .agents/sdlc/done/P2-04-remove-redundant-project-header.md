# Remove Redundant Project Header

## Priority: P2 - Visual Polish

## Context
There's a `ProjectInfo` component below the header that displays project name, path, last updated time, and VCS indicator. This information is redundant with the project selector and takes up valuable vertical space.

## Current State

In `components/layout/app-shell.tsx`:
```tsx
<Header ... />
<ProjectInfo />  // <-- Redundant
<main>...</main>
```

`ProjectInfo` displays:
- Folder icon + project name
- Project path
- Clock icon + last updated time
- Git icon (if vcs === 'git')

The project selector already shows:
- Project name
- Project path

## Acceptance Criteria
- [x] Remove ProjectInfo component from app-shell
- [ ] OR collapse it into the header
- [x] Preserve any unique info if needed (last updated, vcs)

## Options

### Option 1: Remove entirely
Just delete `<ProjectInfo />` from app-shell. The project selector provides enough context.

### Option 2: Move to project selector tooltip/popover
Show detailed project info on hover over the selector.

### Option 3: Collapse into header
If we need the extra info, make it part of the header row, not a separate row.

## Technical Notes

**If removing**:
```tsx
// components/layout/app-shell.tsx
// Simply remove the <ProjectInfo /> line
```

**If moving to popover**:
- Add to project-selector.tsx
- Show on hover or click of info button
- Include: path, updated time, vcs, session count, etc.

## Related Files
- `components/layout/app-shell.tsx`
- `components/project-info.tsx`
- `components/project-selector.tsx`

## Notes
- 2026-01-02: User reported "big project header that's useless, we already have project info in the select"
- 2026-01-02: Removed ProjectInfo from app shell; project selector still shows name/path. No separate header details retained.

## Blockers
- 2026-01-02: `bun check` fails due to Biome formatting issues in `.cmap/cache` JSON and `tsconfig.json` (pre-existing).
