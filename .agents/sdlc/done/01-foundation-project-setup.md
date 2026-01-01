# Project Foundation: Initial Setup and Structure

## Context
This is the foundational work item for repurposing Telechy as an OpenCode UI. We need to decide between creating a fresh project or heavily refactoring the existing Telechy codebase. Given the scope of changes (removing Convex, Material UI, and adding OpenCode SDK), a fresh project with selective code migration is recommended.

This work item enables all subsequent work by establishing the project structure, build configuration, and development environment.

## Acceptance Criteria
- [ ] Project scaffold created with Next.js 14+ App Router (or evaluate Vite for simpler setup)
- [ ] Tauri v2 integration configured for desktop builds
- [ ] TypeScript strict mode enabled with proper tsconfig
- [ ] Biome configured for linting and formatting (port from Telechy)
- [ ] Development scripts working: `bun dev`, `bun build`, `bun tauri dev`
- [ ] Basic folder structure established matching exploration decisions
- [ ] Git repository initialized with proper .gitignore
- [ ] Package.json with core dependencies only (no Material UI, no Convex)

## Technical Guidance

### Project Structure
```
opencode-ui/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home/project selection
│   └── session/
│       └── [id]/
│           └── page.tsx   # Session view
├── components/
│   ├── ui/                # React Aria primitives
│   ├── panes/             # Pane system components
│   ├── session/           # Session-specific components
│   ├── graph/             # ReactFlow components
│   └── config/            # Configuration panes
├── context/               # React context providers
├── hooks/                 # Custom hooks
├── lib/
│   ├── opencode/          # OpenCode SDK wrappers
│   └── utils/             # Utility functions
├── src-tauri/             # Tauri Rust code
└── types/                 # TypeScript type definitions
```

### Key Dependencies
```json
{
  "dependencies": {
    "@opencode-ai/sdk": "latest",
    "@xyflow/react": "^12.0.0",
    "@dagrejs/dagre": "^1.0.0",
    "react-aria-components": "^1.0.0",
    "@legendapp/state": "^2.0.0",
    "tailwindcss": "^3.4.0",
    "next": "^14.0.0"
  }
}
```

### Files to Migrate from Telechy
- `tailwind.config.js` - base configuration
- `biome.json` - linting rules
- `src-tauri/` - Tauri configuration (adapt as needed)
- Color tokens and CSS variables from `globals.css`

### Evaluation: Next.js vs Vite
- **Next.js**: Keep if we want SSR, API routes, or familiarity from Telechy
- **Vite**: Consider for simpler SPA, faster dev server, easier Tauri integration
- Recommendation: Start with Next.js for consistency, can migrate to Vite later if needed

## Dependencies
None - this is the foundation work item

## Estimated Effort
1-2 days

## Notes
- Keep Telechy codebase as reference, don't modify it
- Create new project in separate directory
- Consider using `bun create` for initial scaffold
