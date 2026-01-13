# Harden OpenCode server defaults in Fractals UI

## Context
Recent OpenCode advisory (GHSA-c83v-7274-4vgp) highlights risk when a UI can connect to an attacker-controlled server and render unsafe content. Fractals currently connects to arbitrary server URLs without version gating or password handling, and onboarding instructions encourage running `opencode serve` without a server password.

## Acceptance Criteria
- [ ] Warn (and optionally block auto-connect) when the server version is missing or < 1.1.10, with a clear override path.
- [ ] Update onboarding instructions to recommend `OPENCODE_SERVER_PASSWORD` and call out the risk of running without it.
- [ ] Add a UI input for an optional server password and pass it through the SDK client; do not persist the password in localStorage.

## Technical Notes
- Update `hooks/useServerConnection.ts` `MIN_SERVER_VERSION` and compatibility messaging.
- Update `components/init-modal.tsx` command text and copy.
- Extend `lib/opencode/client.ts` to accept headers/auth (confirm SDK config for password header).

## Notes
2026-01-12: Backlog item created for secure defaults when connecting to OpenCode servers.
