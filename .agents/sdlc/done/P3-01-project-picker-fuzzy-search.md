# Add Fuzzy Search to Project Picker

## Priority: P3 - Quality of Life

## Context
The project picker is a simple dropdown that lists all projects. With many projects, it becomes hard to find the right one. User requested "local fuzzy search at the very least".

## Current State

In `components/project-selector.tsx`:
```tsx
<Select
  aria-label="Project"
  items={projectItems}
  className="w-[260px]"
  placeholder={placeholder}
  selectedKey={currentProject?.id}
  ...
>
  {(project) => (
    <SelectItem id={project.id} textValue={formatProjectName(project)}>
      ...
    </SelectItem>
  )}
</Select>
```

Simple select with all projects as items. No filtering.

## Acceptance Criteria
- [x] Search/filter input in project selector
- [x] Fuzzy matching on project name and path
- [x] Keyboard navigation through filtered results
- [x] Clear/reset filter capability
- [x] Results update as user types (debounced)

## Technical Notes

**Option 1: ComboBox instead of Select**
React Aria has ComboBox which supports filtering:
```tsx
<ComboBox
  items={filteredProjects}
  inputValue={searchTerm}
  onInputChange={setSearchTerm}
>
  ...
</ComboBox>
```

**Option 2: Custom search with Select**
Add Input above Select, filter `projectItems`:
```tsx
const filteredProjects = useMemo(() => 
  projects.filter(p => 
    fuzzyMatch(searchTerm, formatProjectName(p)) ||
    fuzzyMatch(searchTerm, p.worktree)
  ),
[projects, searchTerm])
```

**Fuzzy matching library options**:
- `fuse.js` - Full-featured fuzzy search
- `match-sorter` - Simple but effective
- Custom: Simple `includes()` or regex

**Simple fuzzy match**:
```tsx
const fuzzyMatch = (query: string, text: string): boolean => {
  const lower = text.toLowerCase()
  const chars = query.toLowerCase().split('')
  let lastIndex = -1
  return chars.every(char => {
    const index = lower.indexOf(char, lastIndex + 1)
    if (index === -1) return false
    lastIndex = index
    return true
  })
}
```

## Related Files
- `components/project-selector.tsx`
- `components/ui/select.tsx` - May need ComboBox component

## Notes
- 2026-01-02: User requested fuzzy search
- 2026-01-02: Added debounced search input with fuzzy matching, clear control, and filtered project list in `components/project-selector.tsx`.
