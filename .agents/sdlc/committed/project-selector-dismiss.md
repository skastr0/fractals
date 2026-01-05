# Fix Project Selector Dropdown Dismissal

## Context
The project selector dropdown relies on a manual document handler and currently fails to dismiss reliably. We need consistent outside-click and keyboard dismissal without breaking multi-select behavior.

## Acceptance Criteria
- [ ] Clicking anywhere outside the ProjectSelector closes the dropdown, clears the search term, and restores the selection label in the input.
- [ ] Clicking inside the selector (input, list items, scrolling) keeps the dropdown open; multi-select toggles continue to work.
- [ ] Pressing Escape while the input is focused closes the dropdown, clears the search term, and leaves focus on the input.
- [ ] The “Add project” button still opens its dialog and the dropdown does not remain open behind it.
- [ ] Event listeners are attached once and removed on unmount; no console errors or stuck-open states.

## Technical Implementation Notes
- `components/project-selector.tsx`: tighten the document handler (consider `pointerdown` with capture and `event.composedPath()`).
- Create a `closeDropdown()` helper to centralize `isOpen`, `searchTerm`, and `inputRef.blur()` behavior.
- Ensure close logic runs only when `isOpen` is true and ignore clicks inside `containerRef`.

## Estimated Complexity
Simple (1-2 hours)

## Dependencies
None

## Notes
2026-01-05: Created from commit plan.
