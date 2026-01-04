# Fix Pane Layout - Remove Empty Space

## Context
Session pane left unused horizontal space and allowed vertical overflow. Adjust pane container sizing and session pane layout to keep content contained and scrollable.

## Acceptance Criteria
- [x] Pane fills available width (no empty space on right)
- [x] Content stays within pane bounds
- [x] No page-level vertical scrollbar from pane content
- [x] Pane has internal scroll for message list only

## Notes
- 2026-01-02: Updated pane container width handling, pane width style, and session pane overflow layout. Files changed: components/panes/pane-container.tsx, components/panes/pane.tsx, components/panes/session-pane.tsx. bun test passed; bun check failed due to existing lint/type errors in components/ui/status-dot.tsx.
