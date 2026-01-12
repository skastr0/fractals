# Fractals

**See the tree. Control the swarm.** → https://fractals.sh

## Project Overview

Graph-native interface for OpenCode. Visualize sessions, track subagents, and control parallel workflows—all in one view.

When you're running parallel sessions with subagents spawning subagents, the terminal becomes a wall of text. Fractals gives you a graph. You see which agents are running, what they're working on, and how they relate to each other.

## Key Concepts

- **Sessions as Nodes**: Every session is a node. Subagents branch off naturally. You see the structure, not just the list.
- **Subagent Hierarchy**: Sessions have `parentID` and `depth` fields. Depth-based coloring shows the tree at a glance.
- **Pane System**: Open sessions side-by-side. Compare outputs. Monitor multiple agents without tab-switching.
- **Real-time Sync**: SSE streaming from OpenCode. No polling, no refresh. Watch agents work as they work.

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **UI Components**: React Aria (no Material UI)
- **Styling**: Tailwind CSS with tailwind-variants
- **Graph**: ReactFlow + Dagre layout
- **State**: Legend State for observables
- **Backend**: OpenCode SDK for server communication

## Build & Development

- `bun install`: Install dependencies
- `bun dev`: Start development server
- `bun build`: Production build
- `bun lint`: Run Biome linter
- `bun check`: Run linter + TypeScript check

## Project Structure

```
app/                    # Next.js App Router pages
components/
├── ui/                 # React Aria primitives (Button, Input, etc.)
├── graph/              # ReactFlow components (SessionNode, SessionGraph)
├── panes/              # Pane system (SessionPane, ConfigPane, etc.)
└── session/            # Session view components (MessageList, Parts)
context/                # React context providers
hooks/                  # Custom hooks
lib/
├── opencode/           # OpenCode SDK wrappers
└── utils/              # Utility functions
types/                  # TypeScript type definitions
.agents/sdlc/           # Work items and project planning
```

## OpenCode Integration

The app connects to a local OpenCode server (default: localhost:5577) and uses:
- `@opencode-ai/sdk` for API calls
- SSE subscription for real-time updates
- `x-opencode-directory` header for project selection

## Design Principles

1. **Sessions as nodes** - Not individual messages
2. **Stock OpenCode** - No server modifications required
3. **React Aria** - Accessible, unstyled components
4. **Pane-based navigation** - Multi-pane for side-by-side views
5. **Dark theme first** - Matches OpenCode aesthetics

## Codebase Knowledge Map (cmap)

This project uses cmap for codebase indexing and navigation. The knowledge map is auto-loaded via `.opencode/opencode.json`.

### Key Files

- `.cmap/views/ROOT_ATLAS.md` - Top-level overview of the codebase (auto-loaded)
- `.cmap/views/TERMS.md` - Glossary of domain terms and concepts
- `.cmap/views/CONNECTIONS.md` - Module dependencies and relationships
- `.cmap/views/folders/*.md` - Per-folder summaries

### Usage

**Read the atlas first** when exploring unfamiliar code:
```bash
# Check what exists
cmap_atlas

# Or read directly
read .cmap/views/ROOT_ATLAS.md
```

**Rebuild after significant changes**:
```bash
cmap_build
```

**Check status**:
```bash
cmap_status
```

### When to Rebuild

Rebuild the cmap index when:
- Adding new files or folders
- Renaming or moving files
- After significant refactoring
- Starting a new session (if stale)
