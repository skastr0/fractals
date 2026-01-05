# Performance and Message Rendering Overhaul

id: performance-and-message-rendering-overhaul

## Context

The OpenCode Tree UI has severe performance issues causing multi-second delays for operations that should be instant (local data). Investigation revealed two interrelated problems:

1. **Legend State misuse** causing cascade re-renders
2. **Flawed message list architecture** preventing effective virtualization

### Root Causes Identified

**Legend State Issues:**
- `useSessions.ts:57` - Global subscription to entire sessions record via `use$(() => state$.data.sessions.get())`
- Every SSE event triggers: useSessions → useSessionGraph → ELK layout → all nodes re-render
- `syncSession` fetches from server on every open (no caching)
- ELK layout not debounced (runs on every change)

**Message List Architecture Flaw:**
- Virtualization is at "turn" level (user message + ALL assistant responses)
- A single turn can contain 50+ parts (text, reasoning, tool calls, code blocks)
- `estimateSize: 200px` but turns can be 5000px+
- During streaming, entire MessageTurn re-renders for each token
- TypewriterEffect adds artificial complexity for no real benefit

### Chosen Solution

**Flat Virtualization with Collapsed-by-Default:**

1. Flatten message list to individual items (not turns)
2. Each part is its own virtualized item (~40-60px collapsed)
3. Default state: collapsed with 1-2 sentence preview
4. Expand on click (lazy render heavy content)
5. Only streaming item auto-expands

**New Component Architecture:**
```
MessageList (virtualized over ALL items)
├── UserMessageItem     (~48px)
├── PartItem (collapsed) (~40px) - "💭 Thinking · First 100 chars..."
├── PartItem (collapsed) (~40px) - "📖 Read · src/auth/jwt.ts"
├── PartItem (collapsed) (~40px) - "✏️ Edit · src/auth/jwt.ts · +12 -3"
├── PartItem (collapsed) (~40px) - "💬 I've fixed the JWT..."
└── UserMessageItem     (~48px)
```

**Benefits:**
- Uniform item sizes → perfect virtualization
- DOM nodes per item: 5-10 (not 50-500)
- Only expanded items render heavy content
- Streaming item auto-expands, historical items stay collapsed
- No TypewriterEffect needed

### Research Sources

- Vercel Streamdown: Streaming markdown with incremental parsing, memoization, lazy Shiki
- AI SDK Elements: Composable AI UI components (ChainOfThought, ToolCall, etc.)

## Acceptance Criteria

- [ ] AC-1: Initial session list loads instantly (<100ms for 100+ sessions)
- [ ] AC-2: Clicking a session node opens the pane instantly (<100ms)
- [ ] AC-3: Message list with 1000+ parts scrolls at 60fps
- [ ] AC-4: Parts are collapsed by default with preview text
- [ ] AC-5: Expanding a part lazy-loads the heavy content
- [ ] AC-6: Streaming content displays without layout shift
- [ ] AC-7: TypewriterEffect is removed

## Technical Notes

### Phase 1: Legend State Fixes (Foundation)
- Fix global sessions subscription in useSessions
- Add caching guard to syncSession  
- Debounce ELK layout
- Stabilize node data references

### Phase 2: Flat Virtualization (Core Change)
- Create FlatItem type for unified rendering
- Flatten messages to individual items
- Implement PartPreview component (collapsed state)
- Update virtualizer to use flat items

### Phase 3: Expand/Collapse Mechanics
- Track expanded state per item
- Lazy render content on expand
- Height re-measurement on expand
- Auto-expand streaming item

### Phase 4: Rich Content Components
- StreamingMarkdown with block repair
- CodeBlock with lazy Shiki
- DiffView for edit operations
- ChainOfThought for reasoning

## Child Work Items
- `.agents/sdlc/committed/fix-global-sessions-subscription.md` (id: fix-global-sessions-subscription)
- `.agents/sdlc/committed/add-syncsession-caching.md` (id: add-syncsession-caching)
- `.agents/sdlc/committed/debounce-elk-layout.md` (id: debounce-elk-layout)
- `.agents/sdlc/committed/stabilize-session-node-data.md` (id: stabilize-session-node-data)
- `.agents/sdlc/committed/create-flat-item-model.md` (id: create-flat-item-model)
- `.agents/sdlc/committed/build-part-preview-component.md` (id: build-part-preview-component)
- `.agents/sdlc/committed/wire-flat-virtualizer.md` (id: wire-flat-virtualizer)
- `.agents/sdlc/committed/remove-typewriter-effect.md` (id: remove-typewriter-effect)
- `.agents/sdlc/committed/implement-expand-collapse-state.md` (id: implement-expand-collapse-state)
- `.agents/sdlc/committed/lazy-render-expanded-content.md` (id: lazy-render-expanded-content)
- `.agents/sdlc/committed/auto-expand-streaming-items.md` (id: auto-expand-streaming-items)
- `.agents/sdlc/committed/add-streaming-markdown-component.md` (id: add-streaming-markdown-component)
- `.agents/sdlc/committed/lazy-shiki-codeblock.md` (id: lazy-shiki-codeblock)
- `.agents/sdlc/committed/add-diffview-component.md` (id: add-diffview-component)
- `.agents/sdlc/committed/add-chain-of-thought-component.md` (id: add-chain-of-thought-component)

## Time Estimate
predicted_hours: 16-24

## Notes

2025-01-04: Exploration complete. Architecture validated through research of Vercel Streamdown and AI SDK Elements. Ready for commitment phase.
