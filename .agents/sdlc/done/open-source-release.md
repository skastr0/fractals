# Open Source Release - Rebrand to Fractals

## Context
Preparing the codebase for open source release with a rebrand from "OpenCode Tree UI" to "Fractals" (fractals.sh domain).

## Acceptance Criteria
- [x] MIT LICENSE file added
- [x] README.md rewritten with project-specific documentation
- [x] CONTRIBUTING.md added with contribution guidelines
- [x] Package name changed to "fractals"
- [x] App title/metadata updated to "Fractals"
- [x] All internal references updated (localStorage keys, comments)
- [x] Build passes after changes

## Technical Notes
Files to update:
- package.json (name)
- app/layout.tsx (metadata)
- app/globals.css (comment)
- AGENTS.md (title)
- hooks/useCommandPaletteData.ts (localStorage key)
- hooks/useSessionOptions.ts (localStorage keys)
- components/connection-status.tsx (fallback title)

## Notes
2026-01-11: Starting open source preparation work
