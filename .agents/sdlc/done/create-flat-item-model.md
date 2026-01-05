# Create flat item model and flattener

id: create-flat-item-model

## Context
Breakdown from performance-and-message-rendering-overhaul to enable per-item virtualization instead of turn-level rendering.

## Acceptance Criteria
- [x] AC-1: A new `FlatItem` type covers user messages and assistant parts with stable ids and metadata.
- [x] AC-2: A pure flattener converts session messages + parts into an ordered `FlatItem[]`.

## Technical Notes
- New file suggestion: `components/session/flat-items.ts` or `lib/session/flat-items.ts`.
- Inputs: messages from `useSession`, parts from `getParts`.
- Output order should match current UI ordering (user message then assistant parts).

## Dependencies
none

## Notes
2026-01-04: Added flat item model and flattener in lib/session/flat-items.ts; bun check clean.

## Time Estimate
predicted_hours: 3
