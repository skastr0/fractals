# UI Improvements Batch - Session Pane & Tree UI

## Context
Batch of UI improvements to address UX issues in the tree UI session pane.

## Work Items Completed

### 1. Fix Nested Collapsible Boxes
**Problem**: Session messages had collapsible items that rendered another collapsible box inside - poor UX with nested collapsibles.

**Solution**: 
- Refactored `tool-part.tsx` - replaced `BlockTool` (which had its own collapsible) with `ToolContent` (content-only wrapper)
- Updated `chain-of-thought.tsx` to remove its collapsible wrapper
- Parent `PartItem` component now handles all collapsibility

**Files Changed**:
- `components/session/parts/tool-part.tsx`
- `components/session/parts/chain-of-thought.tsx`

### 2. Respect Hidden/Injected Messages  
**Problem**: Synthetic/system-injected messages should be collapsed by default but still visible.

**Solution**:
- Added `isSynthetic` property to `PartItem` interface in `flat-items.ts`
- Updated `flattenMessages()` to detect synthetic text parts
- Modified `message-list.tsx` `isExpanded()` to collapse synthetic parts by default
- Added "System" label to synthetic text preview in `part-preview.tsx`

**Files Changed**:
- `lib/session/flat-items.ts`
- `components/session/message-list.tsx`
- `components/session/part-preview.tsx`

### 3. Add Project Search in New Session UI
**Problem**: No way to search/filter projects when creating a new session.

**Solution**:
- Added `projectSearch` state to header
- Added `filteredProjects` memo with search filtering by name/path/worktree
- Added search input with clear button in the new session dialog

**Files Changed**:
- `components/layout/header.tsx`

### 4. Make Text Input Expandable
**Problem**: The message input textarea was fixed at 1 row, limiting visibility for longer messages.

**Solution**:
- Added `isExpanded` and `isFocused` state
- Textarea now expands to 6 rows on focus or when manually expanded
- Added expand/collapse toggle button in the input area

**Files Changed**:
- `components/session/session-input.tsx`

## Acceptance Criteria
- [x] Single collapsible layer per message part (no nesting)
- [x] Synthetic/system messages collapsed by default with visible entry
- [x] Project search available in new session dialog
- [x] Text input expandable on focus with manual toggle

## Notes
2026-01-10: Implementation complete, ready for review.
