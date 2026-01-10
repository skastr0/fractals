# Add clipboard paste upload to session input

## Context
Enable pasting files into the session input textarea to create attachments while preserving normal text paste behavior. Estimated effort: 1-2 hours.

## Acceptance Criteria
- [x] Pasting one or more files into the textarea appends new attachments without clearing existing ones.
- [x] Pasting text with or without files continues to insert text into the textarea.
- [x] Non-file clipboard items are ignored without throwing errors.
- [x] Multiple pasted files preserve their original filenames in attachments.

## Technical Notes
- Implement a `handlePaste` function near `handleFileChange` in `components/session/session-input.tsx` and pass it to the textarea `onPaste` prop.
- Use `event.clipboardData?.items` (fallback to `event.clipboardData?.files`) to collect `File` objects and filter by `item.kind === "file"` and `file.size > 0`.
- Convert files with `fileToAttachment` and append via `setFiles((prev) => [...prev, ...newFiles])`.
- Do not call `event.preventDefault()` so text paste still works; handle files asynchronously.

## Notes
2026-01-10: Created from commit plan.
2026-01-10: Added clipboard paste handler in session input to append attachments.
