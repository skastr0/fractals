# Build unified diff formatting utilities
id: session-diff-format-utils

## Context
Parent: session-diff-viewer. Provide unified diff strings for PierreDiffView and clipboard formatting from OpenCode `FileDiff[]` data.

## Acceptance Criteria
- [x] AC-1: `lib/utils/diff-format.ts` exports a function that converts a `FileDiff[]` into unified diff strings using `createTwoFilesPatch`, preserving file paths.
- [x] AC-2: Utility exposes a clipboard formatter that returns `file path + unified diff` text for a single `FileDiff`.
- [x] AC-3: Empty or unchanged files return a safe fallback (empty diff or header-only) without throwing.

## Technical Notes
- Use the `diff` package `createTwoFilesPatch` with `before`/`after` strings.
- Normalize line endings to `\n` before diffing to avoid noisy output.
- Keep helpers pure so they can be unit tested.

## Time Estimate
1.5 hours

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Implemented unified diff formatting utilities and tests. Files changed: lib/utils/diff-format.ts, lib/utils/index.ts, tests/diff-format.test.ts.

## Blockers
- 2026-01-10: `bun check` fails due to unsorted imports in `components/ui/diff-stats-widget.tsx` (pre-existing lint issue).
