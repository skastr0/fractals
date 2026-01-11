# Throttle StreamingMarkdown parsing

## ID
PERF-004

## Context
`StreamingMarkdown` reparses on every token update, which becomes expensive for long streaming messages. We need to reduce parse frequency while keeping the stream responsive.

## Time Estimate
2 hours

## Acceptance Criteria
- [x] Streaming markdown reparses at most once per configured throttle window (or on block boundaries).
- [x] Final rendered markdown matches the non-streaming output after completion.
- [x] No visible flashing or broken fences during streaming updates.

## Technical Notes
- Introduce throttled content state (e.g., `useDeferredValue`, timer-based batching, or a custom hook).
- Keep `repairMarkdown` behavior but avoid re-running on every token.
- Ensure the throttle is bypassed when streaming ends.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Added throttled streaming markdown updates with final flush. Files changed: components/ui/streaming-markdown.tsx.
