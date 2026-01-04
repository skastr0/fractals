# Session Input Controls Enhancement

## Priority: P1 - Core Functionality

## Context
The session input bar needs proper controls for agent selection, model selection, and file attachments. These controls should match what's available in the OpenCode CLI while respecting what the SDK exposes.

## Current State
`components/session/session-input.tsx`:
- Basic textarea with submit
- Has placeholders for attachments
- Has upload button UI
- No agent/model selection

## Acceptance Criteria

### File Attachments
- [x] Upload button opens file picker
- [x] Display attached files as chips/pills
- [x] Remove attachment capability
- [x] Files sent via `options.files` in sendMessage

### Agent Selection (if SDK supports)
- [ ] Dropdown/select for available agents
- [ ] Current agent shown
- [ ] Agent sent via `options.agent` in sendMessage
- [ ] Research: What agents does SDK expose?

### Model Selection (if SDK supports)
- [ ] Dropdown/select for available models
- [ ] Show provider + model name
- [ ] Model sent via `options.model` in sendMessage
- [ ] Research: What models does SDK expose?

### SDK Parity Research
- [ ] Document what controls CLI has that SDK doesn't expose
- [ ] Document any web-specific limitations
- [ ] Note: Slash commands may not work via API
- [ ] Note: @ mentions/tags may not work via API

## Technical Notes

**Current sendMessage signature** (from `lib/opencode/sessions.ts`):
```tsx
interface SendMessageOptions {
  sessionId: string
  content: string
  files?: SessionFileAttachment[]
  agent?: string
  model?: { providerID: string; modelID: string }
}
```

**File attachment format**:
```tsx
interface SessionFileAttachment {
  mime: string
  url: string
  filename?: string
}
```

**SDK Config endpoints to explore**:
- `client.config.list()` - May expose available agents/models
- `client.provider.list()` - Available providers
- `client.model.list()` - Available models
- Research needed on agent listing

**UI Pattern suggestions**:
- Agent selector: Compact dropdown in input bar
- Model selector: Compact dropdown or popover
- Files: Chips above input textarea

## Related Files
- `components/session/session-input.tsx`
- `lib/opencode/sessions.ts`
- `lib/opencode/client.ts`

## Research Tasks
1. Check `@opencode-ai/sdk` for config/provider/model list APIs
2. Test what happens when invalid agent/model is passed
3. Document any undocumented but working options

## Notes
- 2026-01-02: Scoped during user feedback review
- 2026-01-02: Implemented file attachment UI/send flow. Agent/model selection deferred per user scope.
