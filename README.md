# Fractals

A visual tree-based frontend for [OpenCode](https://github.com/anomalyco/opencode) agent sessions.

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
- [OpenCode](https://github.com/anomalyco/opencode) installed

## Installation

```bash
git clone https://github.com/skastr0/fractals.git
cd fractals
bun install
```

## Usage

1. **Start OpenCode server** in your project directory:
   ```bash
   opencode serve
   ```

2. **Start Fractals**:
   ```bash
   bun run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

4. Fractals auto-discovers the OpenCode server (default: localhost:5577)

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + Enter` | Send message |
| `Escape` | Close panes/dialogs |
| Arrow keys | Navigate graph |

## Development

```bash
bun install        # Install dependencies
bun run dev        # Start dev server
bun run build      # Production build
bun run check      # Lint + type check
bun test           # Run tests
```

## Tech Stack

- [Next.js](https://nextjs.org/) with App Router
- [React Aria](https://react-spectrum.adobe.com/react-aria/) for accessible components
- [Tailwind CSS](https://tailwindcss.com/) with tailwind-variants
- [ReactFlow](https://reactflow.dev/) for node visualization
- [Legend State](https://legendapp.com/open-source/state/) for reactive state

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
