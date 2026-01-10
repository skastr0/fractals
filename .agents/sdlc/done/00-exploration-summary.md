# OpenCode UI Integration - Telechy as OpenCode Frontend

## Context

Repurpose Telechy's powerful tree-based UI as a frontend for OpenCode server. This creates a visual-first entry point to OpenCode's rich agent ecosystem.

## Core Vision

1. **Session Graph** - Visualize sessions (including subagents) as a tree using ReactFlow
2. **Configuration Panes** - Display/edit opencode.json configs (global + project), rich metadata
3. **React Aria UI** - Complete component rebuild, no Material UI
4. **Stock OpenCode** - Must work with unmodified OpenCode server

## Key Insights from Exploration

### What We Keep from Telechy
- ReactFlow + Dagre layout engine (change nodes from messages → sessions)
- Pane system architecture (complex, well-tested)
- Multi-pane support for side-by-side comparison
- General UI shape and feel
- TypewriterEffect, streaming patterns

### What We Replace
- Material UI → React Aria components
- Convex backend → OpenCode SDK + SSE
- Workbooks → Projects (folder paths)
- Message tree → Session tree (including subagents!)
- All Convex hooks → OpenCode API calls

### What We Add
- Project selector (recent + file picker)
- opencode.json config viewer/editor panes
- Server/project metadata display
- Session status indicators (pending permissions, running, idle)
- Subagent visualization in tree

## OpenCode Concepts to Display

### Sessions
- id, title, parentID (fork parent), depth (subagent level)
- status: running, idle, pending_permission
- time: created, updated, archived

### Messages & Parts
- User messages with model selection
- Assistant messages with parts (text, reasoning, tool, patch, etc.)
- Tool state: pending → running → completed/error

### Configuration (opencode.json)
- Global: ~/.config/opencode/opencode.json
- Project: .opencode/opencode.json
- Settings: providers, models, agents, tools, MCP servers

### Server Metadata
- Connected projects
- Running sessions
- Available providers/models

## Technical Decisions

### UI Framework
- React Aria for accessible, unstyled components
- Tailwind for styling (keep from Telechy)
- No Material UI

### State Management
- Keep Legend State (@legendapp/state) for observables
- Or consider simpler approach with React Query + Zustand

### Data Fetching
- OpenCode SDK: @opencode-ai/sdk
- SSE subscription for real-time updates
- Local-first, no cloud dependencies

## Acceptance Criteria (High Level)

- [ ] Connect to local OpenCode server
- [ ] Select/switch between projects
- [ ] View session tree with subagents visualized
- [ ] Open session details in pane
- [ ] Send messages, receive streaming responses
- [ ] Fork from any message
- [ ] View/edit opencode.json configs
- [ ] Display server/project metadata
- [ ] Status indicators on session nodes
- [ ] Multi-pane support maintained

## Notes
- 2024-12-31: Initial exploration complete, ready for commitment phase
