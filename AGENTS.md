# OpenCode Tree UI

Visual tree-based frontend for OpenCode agent sessions.

## Project Overview

This is a React/Next.js application that provides a visual interface for OpenCode's local agent server. It displays sessions (including subagent hierarchies) as an interactive tree using ReactFlow.

## Key Concepts

- **Sessions as Nodes**: Each OpenCode session is displayed as a node in the tree
- **Subagent Visualization**: Sessions have `parentID` and `depth` fields that create the hierarchy
- **Pane System**: Multi-pane interface for viewing session details, configurations, and metadata
- **SSE Sync**: Real-time updates via Server-Sent Events from OpenCode server

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
