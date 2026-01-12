# Fractals

**See the tree. Control the swarm.**

A graph-native interface for [OpenCode](https://github.com/anomalyco/opencode). Visualize sessions, track subagents, and control parallel workflows—all in one view.

OpenCode is powerful. But when you're running parallel sessions with subagents spawning subagents, the terminal becomes a wall of text. Fractals gives you a graph. You see which agents are running, what they're working on, and how they relate to each other. Click a node to inspect it. Open multiple panes to compare sessions. Watch token usage climb in real-time.

## Features

- **Session Graph** — Every session is a node. Subagents branch off naturally. Zoom, pan, and click to explore the tree.
- **Subagent Visualization** — Depth-based coloring shows you the hierarchy at a glance. Parent agents connect to children. You see the structure, not just the list.
- **Real-time Updates** — SSE streaming from OpenCode. No polling, no refresh. Watch agents work as they work.
- **Multi-project Support** — Switch projects without restarting. Your sessions stay organized by project.
- **Pane System** — Open sessions side-by-side. Compare outputs. Monitor multiple agents without tab-switching.
- **Token Stats** — Cost and context usage per session. Know when you're burning tokens before you hit the limit.
- **Diff Viewer** — See exactly what files your agent touched and what changed. Code review without digging.
- **Command Palette** — `Cmd+K` to do anything. Slash commands, navigation, actions—all searchable.
- **Keyboard Navigation** — Arrow keys, shortcuts, focus management. Built for people who don't want to touch a mouse.

## Quick Start

```bash
# Clone and install
git clone https://github.com/skastr0/fractals.git
cd fractals
bun install

# Start OpenCode server in your project
opencode serve

# Start Fractals
bun dev
```

Open [http://localhost:3000](http://localhost:3000) — Fractals auto-discovers your OpenCode server.

**Zero config.** Works with your stock OpenCode server. No forks, no migrations, just connect.

### Prerequisites

- [Bun](https://bun.sh/) runtime
- [OpenCode](https://github.com/anomalyco/opencode) running locally

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

---

**Run 20 agents. See them all.** → [fractals.sh](https://fractals.sh)
