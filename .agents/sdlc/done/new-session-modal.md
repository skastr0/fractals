# Add Modal for New Session Creation

## Context
The New Session button currently creates a session immediately. Add a modal to select project and optional title before creating.

## Acceptance Criteria
- [x] Clicking “New session” opens a modal; no session is created until the user confirms.
- [x] Project selection is required; active project is preselected when available; confirm is disabled when none selected.
- [x] Optional title input is respected when provided.
- [x] On confirm, session is created and a SessionPane opens; loading state and errors are shown inline.
- [x] Cancel/ESC closes the modal without side effects.

## Technical Implementation Notes
- `components/layout/header.tsx`: replace direct create with modal state.
- Use `DialogContent`, `DialogBody`, `DialogFooter` for modal structure.
- Use `useProject` to list projects; implement a simple single-select dropdown/list or reuse ProjectSelector logic.
- Call `client.session.create({ directory, title? })`, then open/stack `SessionPane` via `usePanes`.

## Estimated Complexity
Medium (2-4 hours)

## Dependencies
None

## Notes
2026-01-05: Created from commit plan.
2026-01-05: Implemented modal with project selection and optional title.
