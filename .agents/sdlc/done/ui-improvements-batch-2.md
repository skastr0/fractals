# UI Improvements Batch 2

## Context
User requested several UX improvements to the OpenCode Tree UI:
1. Persist model selection across sessions
2. Show most recently used project at top when creating new sessions
3. Change Enter key to insert newline (Cmd/Ctrl+Enter to submit)
4. Remove the backdrop/opacity effect on graph when panes are open
5. Remove session pane subheader, move info to hover state on title
6. Display token usage/costs/context % in session nodes

## Acceptance Criteria
- [x] Latest selected model is remembered and auto-selected for new sessions
- [x] Project list shows most recently used project first
- [x] Enter key inserts newline in session input; Cmd/Ctrl+Enter submits
- [x] Graph remains at full opacity when panes are open (no dimming)
- [x] Session pane has single header with info available on hover
- [x] Session nodes display context %, token count, and cost inline

## Technical Notes
- Model persistence: Already have `RECENT_MODELS_KEY` in useSessionOptions - need to also persist "last selected"
- Project ordering: ProjectProvider already sorts by `time.updated` - just need to ensure this persists
- Input behavior: Modify `handleKeyDown` in session-input.tsx
- Graph opacity: Remove `graphOpacity` logic in app-shell.tsx
- Session pane: Consolidate header with toolbar in session-pane.tsx
- Node stats: Add token/cost display to session-node.tsx using existing useSessionStats pattern

## Notes
2026-01-10: Created work item, fast-path to building (well-understood changes)
2026-01-10: All 6 changes implemented and tested. Fixed re-fetch loop in useSessionOptions during review. Complete.
