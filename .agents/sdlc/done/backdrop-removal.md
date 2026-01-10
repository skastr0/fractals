# Remove Session Pane Backdrop Darkening

## Context
Opening a session pane darkens the rest of the UI via dialog overlay styles. Remove this visual noise while keeping dialogs functional.

## Acceptance Criteria
- [x] Opening a session pane no longer darkens or blurs the rest of the application.
- [x] Dialogs still open/close properly with focus trapping and ESC dismissal.
- [x] No residual overlay opacity remains during normal pane usage.
- [x] Pane borders and background readability remain unchanged.

## Technical Implementation Notes
- `components/ui/dialog.tsx`: remove `bg-black/50` and `backdrop-blur-sm` from `ModalOverlay` classes (or add a transparent overlay variant).
- If needed, adjust `components/panes/pane.tsx` background (`bg-background/95`, `backdrop-blur-sm`) to fully opaque.
- Verify z-index stacking for dialogs vs panes after change.

## Estimated Complexity
Simple (0.5-1 hour)

## Dependencies
None

## Notes
2026-01-05: Created from commit plan.
2026-01-05: Removed dialog overlay darkening classes.
