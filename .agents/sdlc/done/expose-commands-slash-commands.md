# Expose Commands and Slash Commands in UI

## Context
The OpenCode Tree UI currently provides session viewing and message input, but doesn't expose the command system that OpenCode supports. Users should be able to:
1. Discover available commands and slash commands
2. Execute them from the UI via inline autocomplete OR command palette
3. Get autocomplete/suggestions when typing

## Exploration Findings

### SDK Status: Already Exposed! ✅

The OpenCode SDK **already exposes** command functionality:

| Endpoint | SDK Method | Purpose |
|----------|------------|---------|
| `GET /command` | `client.command.list()` | Lists custom + MCP commands |
| `POST /session/:id/command` | `client.session.command()` | Invokes command in session |
| `POST /tui/execute-command` | `client.tui.executeCommand()` | Triggers UI actions |

### Command Data Structure

```typescript
// Command.Info from SDK types
interface Command {
  name: string;
  description?: string;
  agent?: string;        // specific agent to use
  model?: string;        // specific model to use
  mcp?: string;          // MCP prompt reference
  template?: string;     // prompt template with $ARGUMENTS, $1..
  subtask?: boolean;     // run as subtask
  hints?: string[];      // additional hints
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMMANDS INFRASTRUCTURE                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Layer 1: Core Foundation (~11 hours)                   │    │
│  │  • Types & SDK adapters                                 │    │
│  │  • Command registry (SDK + local commands)              │    │
│  │  • Input parser                                         │    │
│  │  • useCommands hook                                     │    │
│  │  • Execution wrapper                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│              ┌───────────────┴───────────────┐                  │
│              ▼                               ▼                   │
│  ┌─────────────────────┐       ┌─────────────────────────┐      │
│  │ Layer 2: Slash (~6h)│       │ Layer 3: Palette (~7h)  │      │
│  │ • Autocomplete UI   │       │ • Global shortcut       │      │
│  │ • Input integration │       │ • Modal dialog          │      │
│  │ • Execution flow    │       │ • Fuzzy search          │      │
│  └─────────────────────┘       │ • Recents + groups      │      │
│                                └─────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Work Items

### Layer 1: Core Foundation (11 hours total)
| Work Item | Description | Est |
|-----------|-------------|-----|
| `cmd-core-types-sdk` | Define command types + SDK adapters | 1.5h |
| `cmd-core-registry` | Registry merging local + SDK commands | 2h |
| `cmd-core-parser` | Command input parser utility | 1.5h |
| `cmd-core-use-commands` | useCommands hook with caching | 2h |
| `cmd-core-execution` | Command execution wrapper | 2h |
| `cmd-core-command-palette` | Wire palette to registry | 2h |

### Layer 2: Slash Commands (6 hours total)
| Work Item | Description | Est |
|-----------|-------------|-----|
| `cmd-slash-autocomplete-component` | Slash command list component | 2h |
| `cmd-slash-input-integration` | Integrate trigger + popover | 2h |
| `cmd-slash-command-execution` | Wire selection + execution | 2h |

### Layer 3: Command Palette (7 hours total)
| Work Item | Description | Est |
|-----------|-------------|-----|
| `cmd-palette-data-model` | Data model + filtering | 2h |
| `cmd-palette-ui-modal` | Dialog UI + keyboard nav | 2h |
| `cmd-palette-global-shortcuts` | Global mount + Cmd+K | 1h |
| `cmd-palette-execution-recents` | Execute + recents flow | 2h |

**Total Estimated Effort: ~24 hours**

## Build Order

```
Phase 1: cmd-core-types-sdk → cmd-core-parser → cmd-core-registry
Phase 2: cmd-core-use-commands → cmd-core-execution
Phase 3 (parallel):
  - cmd-slash-autocomplete-component → cmd-slash-input-integration → cmd-slash-command-execution
  - cmd-palette-data-model → cmd-palette-ui-modal → cmd-palette-global-shortcuts → cmd-palette-execution-recents
Phase 4: cmd-core-command-palette (final wiring)
```

## Challenges Identified

1. **Session context for palette** - Need shared session context for command execution
2. **Name collisions** - Local and SDK commands may have same names
3. **Keyboard handling** - Must respect FocusManager to avoid input clashes
4. **Async loading** - Commands list may load after UI renders

## Acceptance Criteria
- [x] Understand OpenCode's command architecture
- [x] Determine SDK exposure of command information  
- [x] Identify viable frontend approaches
- [x] Create detailed work items for implementation
- [x] Build core infrastructure
- [x] Build slash command autocomplete
- [x] Build command palette

## Notes
2025-01-10: Exploration complete - SDK already exposes commands
2025-01-10: Committed to building BOTH slash commands AND command palette
2025-01-10: Created 13 work items across 3 layers
2025-01-10: Build + review complete for core, slash, and palette
