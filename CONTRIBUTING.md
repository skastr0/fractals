# Contributing to Fractals

Thank you for your interest in contributing to Fractals! This document provides guidelines and information for contributors.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/fractals.git
   cd fractals
   ```
3. **Install dependencies**:
   ```bash
   bun install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running Locally

```bash
# Start development server
bun dev

# Run linter
bun lint

# Fix lint issues automatically
bun lint:fix

# Type check
bun run check

# Run tests
bun test
```

### Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting. The configuration is in `biome.json`.

Key conventions:
- **TypeScript** throughout - no `any` types unless absolutely necessary
- **React Aria** for UI components - maintains accessibility
- **Tailwind CSS** for styling - use `tailwind-variants` for component variants
- **Legend State** for reactive state - prefer observables over useState for shared state

### Commit Messages

Write clear, concise commit messages:
- Use present tense ("Add feature" not "Added feature")
- Start with a verb (add, fix, update, refactor, remove)
- Keep the first line under 72 characters
- Reference issues when applicable

Examples:
```
feat: add session diff viewer component
fix: resolve race condition in SSE reconnection
refactor: simplify message list virtualization
docs: update README with keyboard shortcuts
```

## Submitting Changes

### Pull Requests

1. **Ensure your code passes all checks**:
   ```bash
   bun run check
   bun test
   ```

2. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Open a Pull Request** against the `main` branch

4. **Describe your changes** in the PR:
   - What does this PR do?
   - Why is this change needed?
   - Any breaking changes?
   - Screenshots for UI changes

### PR Review Process

- PRs require review before merging
- Address review feedback promptly
- Keep PRs focused - one feature or fix per PR
- Rebase on main if your branch falls behind

## Reporting Issues

### Bug Reports

When reporting bugs, include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/OS information
- OpenCode version
- Screenshots if applicable

### Feature Requests

For feature requests:
- Describe the use case
- Explain why existing features don't solve it
- Suggest implementation approach if you have one

## Project Structure

Understanding the codebase:

```
components/
├── ui/          # Reusable UI primitives (Button, Input, Dialog)
├── graph/       # ReactFlow session graph components
├── panes/       # Multi-pane system components
├── session/     # Session viewer components
│   └── parts/   # Message part renderers (text, tool, patch, etc.)
└── layout/      # App shell and layout components

context/         # React context providers for global state
hooks/           # Custom React hooks
lib/
├── opencode/    # OpenCode SDK client wrapper
├── commands/    # Command palette system
├── graph/       # Tree building and session filtering
└── utils/       # Pure utility functions
```

## Questions?

- Open a [Discussion](https://github.com/fractals-sh/fractals/discussions) for questions
- Check existing [Issues](https://github.com/fractals-sh/fractals/issues) before creating new ones

Thank you for contributing!
