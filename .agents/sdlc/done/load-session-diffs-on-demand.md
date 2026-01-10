# Load Session Diffs On Demand

id: load-session-diffs-on-demand

## Context

The session diff feature currently only works with real-time SSE events. When:
- Opening an existing session
- Loading the app with sessions that have diffs
- Navigating to a session that was modified before the SSE connection

...the diff data is NOT loaded, making the feature unusable for historical sessions.

## Problem Analysis

Current data flow:
1. SSE `session.diff` event → stored in `state$.data.sessionDiffs[sessionKey]`
2. `syncSession()` fetches messages but NOT diffs
3. No on-demand fetch for diffs exists

## Acceptance Criteria

- [x] AC-1: Diffs are fetched when opening a session pane (on syncSession or separately)
- [x] AC-2: Diffs are fetched when DiffPane is opened for a session
- [x] AC-3: Diff widget shows correct stats for historical sessions
- [x] AC-4: Avoid duplicate fetches if SSE already provided the data

## Technical Options

1. **Fetch on syncSession** - Add diff fetch to existing session sync flow
2. **Fetch on-demand in DiffPane** - Lazy load when pane opens
3. **Fetch when widget needs data** - In DiffStatsWidget or parent components

## Time Estimate
predicted_hours: 2

## Notes
2026-01-10: Created to address limitation where diffs only load via SSE.
2026-01-10: Added session summary stats, syncSessionDiffs, and DiffPane on-demand loading. Files changed: lib/opencode/sessions.ts, context/SyncProvider.tsx, components/graph/session-node.tsx, components/panes/session-pane.tsx, components/panes/diff-pane.tsx, tests/opencode-health.test.ts.
