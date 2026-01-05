# Build PartPreview component

id: build-part-preview-component

## Context
Breakdown from performance-and-message-rendering-overhaul to provide a lightweight collapsed preview for each part.

## Acceptance Criteria
- [x] AC-1: `PartPreview` renders a single-line summary for all supported part types.
- [x] AC-2: Preview output truncates long content and keeps a predictable row height.

## Technical Notes
- New file suggestion: `components/session/part-preview.tsx`.
- Cover part types from `components/session/part-renderer.tsx` (text, reasoning, tool, file, patch, agent, step, subtask, snapshot, retry, compaction).
- Keep previews single-line with fixed padding for stable virtualization.

## Dependencies
create-flat-item-model

## Time Estimate
predicted_hours: 3

## Notes

2025-01-04: Implemented PartPreview component with the following design decisions:

### Implementation Summary
- Created `components/session/part-preview.tsx` with ~350 lines of focused, well-structured code
- Uses a shared `PreviewLayout` component for consistent visual structure across all part types
- Fixed height of 40px (h-10) for virtualization stability
- Truncation with ellipsis for long content (100 chars text, 80 chars reasoning, 60 chars commands)

### Part Type Coverage
| Part Type | Icon | Label | Preview Content | Badge |
|-----------|------|-------|-----------------|-------|
| text | MessageSquare | - | First 100 chars | - |
| reasoning | Brain (primary) | "Thinking" | First 80 chars | - |
| tool/bash | Terminal | "Bash" | Description or command | - |
| tool/read | BookOpen | "Read" | File path | offset:limit |
| tool/edit | FileEdit | "Edit" | File path | +N -N |
| tool/write | FilePlus | "Write" | File path | - |
| tool/glob | Search | "Glob" | Pattern + path | count |
| tool/grep | Search | "Grep" | Pattern + path | matches |
| tool/list | FolderOpen | "List" | Path | - |
| tool/webfetch | Globe | "Fetch" | URL | - |
| tool/task | GitBranch | Agent type | Description | - |
| tool/todo* | ListTodo | "Todo" | Status text | - |
| file | FileText/FileCode | - | Filename | - |
| patch | FileCode | "Patch" | Hash (8 chars) | file count |
| agent | Bot (primary) | "Subagent" | Name | - |
| subtask | GitBranch (amber) | Agent name | Description | - |
| retry | RefreshCw (amber) | "Retry #N" | Error name | - |
| compaction | Minimize2 | - | "Messages compacted" | auto |
| step-*/snapshot | - | - | null (hidden) | - |

### Visual Design
- Code Brutalism influence with monospace elements for file paths and badges
- Consistent icon coloring: muted-foreground default, primary for emphasis, amber for warnings
- Streaming indicator: green pulsing dot (matches existing patterns)
- Hover state: subtle bg-muted/40 transition
- Chevron right indicator for expandability

### Validation
- `bun check` passes (biome lint + tsc --noEmit)
- All part types handled with fallback for unknown types
- Memo-wrapped for performance

### Files Changed
- `components/session/part-preview.tsx` (new)
