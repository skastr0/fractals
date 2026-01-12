# Init Connection Gate Modal

## Context
Create a modal that gates any connection to OpenCode. This modal serves as:
1. A small intro to the product (Fractals)
2. Instructions on how to connect using `opencode serve` with CORS options
3. A description of how to use the app once connected
4. A privacy disclaimer (no data collection)
5. A confirm button to start the connection process

This modal should appear when the app loads and the user has not yet confirmed/acknowledged it.

## Acceptance Criteria
- [x] Modal appears on first visit (before any connection attempt)
- [x] Shows intro text: "See the tree. Control the swarm."
- [x] Shows connection instructions with `opencode serve --port 5577 --cors https://fractals.sh`
- [x] Shows usage hints (sessions as nodes, + icons for subagents, diff markers)
- [x] Shows privacy disclaimer (local client-side app, no data collection)
- [x] Confirm button that enables connection process
- [x] Modal only shows once (persisted acknowledgment in localStorage)
- [x] Uses existing Dialog/Modal components from ui/
- [x] Non-dismissable except via confirm button

## Technical Notes
- Use localStorage key like `fractals-init-acknowledged` to track if user has seen modal
- Build on existing Dialog component from `components/ui/dialog.tsx`
- Gate the auto-connect logic in `useServerConnection` behind acknowledgment
- Modal should be dismissible only via confirm button (not escape/backdrop click)

## Security Review Notes
- Verified: No analytics SDKs in dependencies
- Verified: No external network calls (only localhost OpenCode server)
- Verified: No cookies for tracking
- Note: localStorage IS used for user preferences (server URL, recent commands, selected project) - this is local browser state, not data exfiltration

## Notes
2026-01-11: Created. Fast-path from backlog (well-understood UI component, clear requirements, similar patterns exist in codebase).

## Review Notes
Sun Jan 11 2026: Review found blocking issues. See review-findings packet.
- **Double Modal Overlay**: `OpenCodeProvider` wraps `InitModal` in `ModalOverlay`, but `InitModal` uses `DialogContent` which *also* includes `ModalOverlay`. This creates a nested overlay structure.

**Resolution** (2026-01-12): Refactored `InitModal` to manage its own `ModalOverlay`/`Modal` directly with an `isOpen` prop instead of using the `DialogContent` wrapper. This eliminates the double-nesting issue. Types and lint pass.
