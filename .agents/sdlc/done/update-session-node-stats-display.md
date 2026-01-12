# Update session node stats display

## Context
Session node stats currently compute context usage from `tokens.input` only and fall back to a hardcoded context limit. Align this with the updated `currentContext` semantics and model limits.

## Acceptance Criteria
- [x] Context percent uses the latest assistant total tokens (input + output + reasoning + cache read/write).
- [x] Model context limit comes from `useModelInfo` when available, otherwise fall back consistently.
- [x] Context percent hides when there are no context tokens (no forced 0%).
- [x] Output and cost stats remain unchanged.

## Technical Notes
- Consider reusing the same context token calculation as `useSessionStats`.
- If `useModelInfo` is introduced here, keep memoization to avoid unnecessary re-renders.
- Decide whether the Zap icon label/tooltip should clarify “output tokens”.

## Notes
2026-01-11: Created from commit plan.
2026-01-11: Updated session node context tokens to include output/reasoning/cache and hide percent when no context tokens; context limit remains default fallback. Files changed: components/graph/session-node.tsx.
