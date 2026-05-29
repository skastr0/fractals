# Contributing

Fractals is an experimental, solo-maintained public source project. The preferred contribution path is issues-first: report reproducible bugs, documentation corrections, or scoped proposals before implementation work begins.

## What Helps

- Reproducible bug reports
- Documentation corrections
- Small fixes after maintainer confirmation
- Scoped proposals that explain maintenance cost

## What Is Out Of Scope

- Large rewrites without prior discussion
- Changes that require a custom OpenCode server fork
- Broad feature work that substantially increases support burden
- Public security reports; use the private reporting path in SECURITY.md

## Local Workflow

```bash
bun install
bun run dev
bun run verify
```

For local development with OpenCode:

```bash
opencode serve
```

Use Biome formatting and TypeScript throughout. UI code should follow the existing React Aria, Tailwind CSS, and Legend State patterns.

## Pull Requests

Pull requests are reviewed when they are linked to an accepted issue or requested by the maintainer. Include verification results and screenshots for UI changes. Unsolicited implementation PRs may be closed to preserve scope, maintenance capacity, compatibility, or product direction.

By contributing, you agree that your contribution is licensed under the MIT license used by this project.
