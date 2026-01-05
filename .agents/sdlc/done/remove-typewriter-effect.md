# Remove TypewriterEffect usage

id: remove-typewriter-effect

## Context
Breakdown from performance-and-message-rendering-overhaul to remove the typewriter animation that increases render churn.

## Acceptance Criteria
- [x] AC-1: No references to `TypewriterEffect` remain in the codebase.
- [x] AC-2: Reasoning parts and any other streaming text render without typewriter animation.

## Technical Notes
- Update `components/session/parts/reasoning-part.tsx`.
- Remove export from `components/session/index.ts`.
- Delete `components/session/typewriter-effect.tsx` if unused.

## Notes
- 2026-01-04: Removed TypewriterEffect usage, deleted component, and verified with `bun check`. Files changed: `components/session/parts/reasoning-part.tsx`, `components/session/index.ts`, `components/session/typewriter-effect.tsx`.

## Dependencies
none

## Time Estimate
predicted_hours: 2
