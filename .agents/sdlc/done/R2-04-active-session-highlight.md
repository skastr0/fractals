# Highlight Active Sessions

## Problem
Active sessions hard to find. Status not properly propagating.

## Solution
Add green glow border and pulsing indicator for busy/active sessions.

## Acceptance Criteria
- [x] Busy sessions have green glowing border
- [x] Green pulsing dot indicator on busy sessions
- [x] Status visually distinguishable: idle (gray), busy (green), retry (yellow), pending (red)
- [x] Animation for active sessions (pulse/glow)
- [x] Status updates in real-time from SSE

## Notes
- 2026-01-02: Updated node styling and status dot animations; status already flows from SSE.
- 2026-01-02: Files changed: components/graph/session-node.tsx, components/ui/status-dot.tsx, hooks/useSessionGraph.ts, components/graph/session-filter.tsx.
- 2026-01-02: Validation: bun test pass; bun check pass.
