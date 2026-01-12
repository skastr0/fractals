# Fractals

A visual tree-based frontend for [OpenCode](https://github.com/opencode-ai/opencode) agent sessions.

Fractals displays your OpenCode sessions as an interactive graph, making it easy to visualize subagent hierarchies, navigate between sessions, and monitor agent activity in real-time.

## Features

- **Session Graph** - Visualize sessions as nodes in an interactive tree layout
- **Subagent Visualization** - See parent-child relationships between agents
- **Real-time Updates** - Live streaming via SSE from OpenCode server
- **Multi-project Support** - Switch between projects seamlessly
- **Pane System** - Multi-pane interface for side-by-side session views
- **Session Input** - Send messages to agents, fork conversations
- **Command Palette** - Quick access to actions and slash commands
- **Diff Viewer** - See file changes made by agents

## Prerequisites

- [Bun](https://bun.sh/) runtime
- [OpenCode](https://github.com/opencode-ai/opencode) server running locally

## Installation

```bash
# Clone the repository
git clone https://github.com/fractals-sh/fractals.git
cd fractals

# Install dependencies
bun install

# Start development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Start OpenCode** - Run OpenCode in your project directory
2. **Connect** - Fractals auto-discovers the OpenCode server (default: localhost:5577)
3. **Explore** - Click session nodes to view details, expand subagents, send messages

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + Enter` | Send message |
| `Escape` | Close panes/dialogs |
| Arrow keys | Navigate graph |

## Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) with App Router
- **UI**: [React Aria](https://react-spectrum.adobe.com/react-aria/) for accessible components
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with tailwind-variants
- **Graph**: [ReactFlow](https://reactflow.dev/) for node visualization
- **State**: [Legend State](https://legendapp.com/open-source/state/) for reactive state
- **Backend**: [@opencode-ai/sdk](https://www.npmjs.com/package/@opencode-ai/sdk) for server communication

## Project Structure

```
app/                    # Next.js App Router pages
components/
├── ui/                 # React Aria primitives (Button, Input, etc.)
├── graph/              # ReactFlow components (SessionNode, SessionGraph)
├── panes/              # Pane system (SessionPane, DiffPane, etc.)
└── session/            # Session view components (MessageList, Parts)
context/                # React context providers
hooks/                  # Custom React hooks
lib/
├── opencode/           # OpenCode SDK wrappers
├── commands/           # Command system
├── graph/              # Tree building and layout
└── utils/              # Utility functions
types/                  # TypeScript type definitions
```

## Development

```bash
# Run development server with Turbopack
bun dev

# Run linter (Biome)
bun lint

# Fix lint issues
bun lint:fix

# Type check
bun run check

# Run tests
bun test
```

## Configuration

Fractals connects to OpenCode's local server. Configure the server URL in the connection dialog if using a non-default port.

| Setting | Default | Description |
|---------|---------|-------------|
| Server URL | `http://localhost:5577` | OpenCode server address |
| Session Filter | Last 6 hours | Time range for displayed sessions |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.

## License

[MIT](LICENSE)

## Links

- [Website](https://fractals.sh)
- [OpenCode](https://github.com/opencode-ai/opencode)
