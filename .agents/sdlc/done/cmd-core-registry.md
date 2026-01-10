# Build registry merging local and SDK commands

## Context
Normalize SDK commands and local UI actions into a single registry that can power both the command palette and slash command execution.

## Acceptance Criteria
- [x] Local command definitions live in a dedicated registry module.
- [x] Registry merges local + SDK commands and resolves name collisions deterministically.
- [x] Helper APIs exist to query by name/category and produce palette-ready lists.

## Technical Notes
- Provide a merge strategy (e.g., prefer local when names collide, with a warning hook).
- Registry should accept injected UI actions (new session, clear selection) instead of hardcoding.
- Normalize fields for consistent filtering (keywords, description, category).

## Dependencies
- `cmd-core-types-sdk.md`.

## Complexity
Medium.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Implemented command registry helpers and local command definitions, updated command palette wiring. Files changed: lib/commands/registry.ts, lib/commands/index.ts, components/layout/command-palette.tsx.
