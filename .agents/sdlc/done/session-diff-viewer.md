# Session Diff Viewer Feature

id: session-diff-viewer

## Context

User wants to visualize git diffs from OpenCode sessions in a rich, interactive way:

1. **DiffStatsWidget** - A compact widget showing +/- lines (green/red) like the subagents button
   - Display in session nodes in the graph
   - Display in session pane header
   - Clicking opens the diff pane

2. **DiffPane** - A new pane type showing session file changes
   - List files with collapsible sections
   - Each section shows the diff using PierreDiffView (gorgeous diff rendering)
   - Copy-to-input button per file that copies file path + diff to ANY session pane's input (no hard coupling)

3. **Data source**: OpenCode SDK already provides:
   - `session.diff(sessionID)` endpoint returning `FileDiff[]`
   - SSE events for `session.diff` already handled in SyncProvider
   - Session summary has `additions`, `deletions`, `files` count

## Technical Complexity Notes

- FileDiff from SDK has `before`/`after` file content strings, NOT unified diff format
- PierreDiffView expects unified diff format (uses parsePatchFiles from @pierre/diffs)
- Need to generate unified diff from before/after content, or render differently
- Copy-to-input requires decoupled communication between panes (no direct state coupling)

## Acceptance Criteria

- [ ] AC-1: DiffStatsWidget displays +N/-M in green/red, matches subagent button style
- [ ] AC-2: Widget visible on session nodes when session has file changes
- [ ] AC-3: Widget visible in session pane header when session has file changes
- [ ] AC-4: Clicking widget opens DiffPane for that session
- [ ] AC-5: DiffPane shows collapsible file sections with filename headers
- [ ] AC-6: Each file section renders diff using pierre diff components
- [ ] AC-7: Copy button per file copies file path + diff content to clipboard in a format ready for pasting into session input
- [ ] AC-8: Copy action works independently of which pane is active (no hard coupling)
- [ ] AC-9: UI follows existing design patterns (tailwind-variants, React Aria)

## Time Estimate
predicted_hours: 6

## Notes
2026-01-10: Created for exploration. Key technical questions:
1. How to convert before/after content to unified diff format?
2. Best UX for copy-to-input - clipboard vs direct injection?
3. Should DiffPane be singleton or allow multiple instances?
