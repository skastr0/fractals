# Contributing to Fractals

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/fractals.git
   cd fractals
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development

```bash
bun run dev        # Start dev server
bun run check      # Lint + type check
bun test           # Run tests
```

For local development with OpenCode:
```bash
opencode serve     # Start OpenCode server in your project directory
```

## Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting.

- TypeScript throughout
- React Aria for UI components
- Tailwind CSS for styling
- Legend State for reactive state

## Submitting Changes

1. Ensure checks pass:
   ```bash
   bun run check
   bun test
   ```

2. Push and open a Pull Request against `main`

3. Describe your changes:
   - What does this PR do?
   - Why is this change needed?
   - Screenshots for UI changes

## Reporting Issues

When reporting bugs, include:
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS information
- Screenshots if applicable

## Questions?

- Open a [Discussion](https://github.com/skastr0/fractals/discussions)
- Check existing [Issues](https://github.com/skastr0/fractals/issues)

Thank you for contributing!
