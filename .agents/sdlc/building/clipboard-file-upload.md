# Clipboard File/Screenshot Upload

## Context
Users want to paste files and screenshots directly from clipboard into the session input, rather than relying solely on the file picker. This is a common UX pattern in chat interfaces (Slack, Discord, ChatGPT, etc.) where Cmd/Ctrl+V pastes images directly.

## Original Request
"Let's allow files / screenshots from clipboard to auto upload to input instead of relying only on the file picker"

## Current State
- `session-input.tsx` has file attachment support via `<input type="file">`
- Files are converted to base64 data URLs via `fileToAttachment()`
- `SessionFileAttachment` type: `{ mime: string, url: string, filename?: string }`
- No paste event handling currently exists

## Acceptance Criteria
- [ ] Paste images from clipboard (screenshots) directly into textarea
- [ ] Paste files from clipboard if supported by browser
- [ ] Visual feedback when pasting
- [ ] Works alongside existing file picker
- [ ] Accessible (screen reader announcements for paste success)

## Open Questions
- What browsers support clipboard file access?
- Should we support pasting multiple images at once?
- What about pasting text that contains image URLs?
- Should pasting be enabled globally on the page or just when textarea is focused?

## Notes
2026-01-10: Created for SDLC exploration
