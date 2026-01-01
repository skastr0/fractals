# Layout and Shell Components

## Context
Create the main layout shell that houses the session graph and panes. This includes the overall page structure, header/navigation, and the responsive layout that balances the graph area with the pane workspace.

## Acceptance Criteria
- [x] AppShell component with graph area and workspace
- [x] Header with project selector and navigation
- [x] Responsive layout that adjusts for pane count
- [x] Graph area opacity changes when workspace is maximized
- [x] Maximize/minimize workspace toggle
- [x] Command bar component (similar to Telechy's center/left modes)
- [x] Status bar at bottom for connection status
- [x] Viewport height handling (for mobile/desktop)

## Technical Guidance

### AppShell Layout
```tsx
// components/layout/app-shell.tsx
import { observer, use$ } from '@legendapp/state/react';
import { usePanes } from '@/context/PanesProvider';
import { Workspace } from './workspace';
import { Header } from './header';
import { StatusBar } from './status-bar';
import { SessionGraph } from '@/components/graph/session-graph';

export const AppShell = observer(function AppShell() {
  const panes$ = usePanes();
  const panes = use$(panes$.panes);
  const totalWidth = panes$.getTotalPaneWidthPercentage();
  const hasPanes = panes.length > 0;

  // Calculate explorer width
  const explorerWidth = hasPanes ? `calc(100% - ${totalWidth}% - 0.5rem)` : '100%';

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      
      <main className="flex-1 flex overflow-hidden relative">
        {/* Session Graph (backdrop) */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ 
            opacity: hasPanes ? 0.7 : 1,
            width: explorerWidth,
          }}
        >
          <SessionGraph />
        </div>

        {/* Panes (foreground) */}
        {hasPanes && (
          <div
            className="absolute right-0 top-0 bottom-0 flex"
            style={{ width: `${totalWidth}%` }}
          >
            <Workspace />
          </div>
        )}

        {/* Command bar */}
        <CommandBar />
      </main>

      <StatusBar />
    </div>
  );
});
```

### Header Component
```tsx
// components/layout/header.tsx
import { useProject } from '@/context/ProjectProvider';
import { ProjectSelector } from '@/components/project-selector';
import { Button } from '@/components/ui/button';
import { Settings, Plus } from 'lucide-react';

export function Header() {
  const { currentProject } = useProject();

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Project Selector */}
        <div className="flex items-center gap-4">
          <ProjectSelector />
          {currentProject && (
            <span className="text-sm text-muted-foreground">
              {currentProject.name ?? currentProject.worktree}
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
```

### Status Bar
```tsx
// components/layout/status-bar.tsx
import { useOpenCode } from '@/context/OpenCodeProvider';
import { Circle } from 'lucide-react';

export function StatusBar() {
  const { health, isConnecting } = useOpenCode();

  return (
    <footer className="h-8 border-t border-border bg-background/95">
      <div className="flex items-center justify-between h-full px-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <Circle
            className={`h-2 w-2 ${
              isConnecting
                ? 'text-warning animate-pulse'
                : health?.connected
                ? 'text-success'
                : 'text-error'
            }`}
            fill="currentColor"
          />
          <span className="text-xs text-muted-foreground">
            {isConnecting
              ? 'Connecting...'
              : health?.connected
              ? 'Connected'
              : 'Disconnected'}
          </span>
        </div>

        {/* Right side - version, etc */}
        <div className="text-xs text-muted-foreground">
          OpenCode UI
        </div>
      </div>
    </footer>
  );
}
```

### Command Bar
```tsx
// components/layout/command-bar.tsx
import { usePanes } from '@/context/PanesProvider';
import { Button } from '@/components/ui/button';
import { Plus, Settings, FolderOpen, GitBranch } from 'lucide-react';
import { tv } from 'tailwind-variants';

const commandBarVariants = tv({
  base: 'flex items-center gap-2 p-2 rounded-full border border-border bg-background/80 backdrop-blur-sm shadow-lg',
  variants: {
    mode: {
      center: 'absolute bottom-6 left-1/2 -translate-x-1/2',
      left: 'flex-col',
    },
  },
});

interface CommandBarProps {
  mode?: 'center' | 'left';
}

export function CommandBar({ mode = 'center' }: CommandBarProps) {
  const panes$ = usePanes();

  const actions = [
    { icon: Plus, label: 'New Session', action: () => {} },
    { icon: FolderOpen, label: 'Open Project', action: () => {} },
    { icon: GitBranch, label: 'View Sessions', action: () => {} },
    { icon: Settings, label: 'Configuration', action: () => panes$.openPane({ type: 'config', component: <div>Config</div> }) },
  ];

  return (
    <div className={commandBarVariants({ mode })}>
      {actions.map(({ icon: Icon, label, action }) => (
        <Button
          key={label}
          variant="ghost"
          size="icon"
          onPress={action}
          aria-label={label}
        >
          <Icon className="h-5 w-5" />
        </Button>
      ))}
    </div>
  );
}
```

### Viewport Height Provider (Port)
Port from Telechy to handle mobile viewport height issues:
```tsx
// context/ViewportHeightProvider.tsx
// Handle mobile browser viewport height differences
// Returns CSS-safe height values
```

## Dependencies
- 07-ui-pane-system
- 04-foundation-core-providers

## Estimated Effort
1 day

## Notes
- Reference Telechy's explorer.tsx for the layout pattern
- Command bar mode (center/left) depends on available space
- Consider adding resize handle between graph and workspace
- 2025-12-31: Implemented AppShell layout, header controls, status bar, command bar, and viewport height provider. Updated pane container width override and main page to render the shell. Files changed: components/layout/app-shell.tsx, components/layout/header.tsx, components/layout/command-bar.tsx, components/layout/status-bar.tsx, components/layout/index.ts, context/ViewportHeightProvider.tsx, context/index.tsx, components/panes/pane-container.tsx, app/page.tsx, components/ui/session-status-badge.tsx, hooks/useSessionStatus.ts.
