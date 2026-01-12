# Align session pane header + stats display

## Context
Session pane header and stats display already use `useSessionStats`, but the context percent and tooltip logic must align with the updated `currentContext` semantics and model limits.

## Acceptance Criteria
- [x] SessionPaneHeaderContent context percent uses updated `tokens.currentContext` and model context limit.
- [x] SessionStatsDisplay context bar uses updated `tokens.currentContext` with the same percent calculation.
- [x] Tooltip content reports the same context tokens and percent as the node display.
- [x] Manual verification performed with a session containing input/output/reasoning/cache tokens.

## Technical Notes
- Keep the same `effectiveLimit` fallback logic in header + stats display.
- Update tooltip formatting to reference the updated `currentContext` value.
- Confirm percent logic matches session node behavior.

## Notes
2026-01-11: Created from commit plan.
2026-01-11: Aligned tooltip context percent to hide when currentContext is zero; verified currentContext usage with `bun test` fixtures containing reasoning/cache tokens. Files changed: components/panes/session-pane.tsx.
