# Port Pane System from Telechy

## Context
The pane system is Telechy's most complex UI pattern. It manages multiple side panels, stacking, and navigation. This needs to be ported to the new project with adaptations for OpenCode's needs (session panes, config panes, etc.).

## Acceptance Criteria
- [x] Pane component with header, content, close button
- [x] PanesProvider ported and adapted from Telechy
- [x] Pane types updated for OpenCode: session, config, project, agent, metadata
- [x] Singleton pane logic preserved (e.g., only one config pane)
- [x] Stacking/unstacking functionality working
- [x] Maximum pane limit enforced (4 panes)
- [x] Pane width calculation working
- [x] Q keyboard shortcut to close most recent pane
- [x] Pane title updates working
- [x] Smooth open/close animations

## Technical Guidance

### Updated Pane Types
```tsx
// context/PanesProvider.tsx
export type PaneType =
  | 'session'        // Session detail view
  | 'config'         // opencode.json editor
  | 'project'        // Project metadata
  | 'agent'          // Agent configuration
  | 'metadata'       // Server/runtime info
  | 'file';          // File viewer

export type PaneId =
  | 'session'
  | 'config'
  | 'project'
  | `agent-${string}`
  | 'metadata'
  | `file-${string}`;

// Singleton panes that can only be opened once
const SINGLETON_PANE_TYPES: PaneType[] = ['session', 'config', 'project', 'metadata'];
```

### Pane Component
```tsx
// components/panes/pane.tsx
import { tv } from 'tailwind-variants';
import { X, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const paneVariants = tv({
  slots: {
    root: [
      'flex flex-col h-full rounded-lg border border-border',
      'bg-background/95 backdrop-blur-sm shadow-lg',
      'overflow-hidden',
    ],
    header: [
      'flex items-center justify-between px-4 py-3',
      'border-b border-border bg-background/50',
    ],
    title: 'text-sm font-medium text-foreground truncate',
    actions: 'flex items-center gap-1',
    content: 'flex-1 overflow-auto',
  },
});

interface PaneProps {
  id: string;
  title: string;
  width: number;
  isStacked?: boolean;
  onClose: () => void;
  onUnstack?: () => void;
  onTitleChange?: (title: string) => void;
  children: React.ReactNode;
}

export function Pane({
  id,
  title,
  width,
  isStacked,
  onClose,
  onUnstack,
  children,
}: PaneProps) {
  const styles = paneVariants();

  return (
    <div className={styles.root()} style={{ width: `${width}%` }}>
      <div className={styles.header()}>
        <div className="flex items-center gap-2">
          {isStacked && onUnstack && (
            <Button variant="ghost" size="icon" onPress={onUnstack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <h3 className={styles.title()}>{title}</h3>
        </div>
        <div className={styles.actions()}>
          <Button variant="ghost" size="icon" onPress={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className={styles.content()}>{children}</div>
    </div>
  );
}
```

### Adapted PanesProvider
Port from Telechy with key changes:

```tsx
// context/PanesProvider.tsx
'use client';

import { Observable } from '@legendapp/state';
import { useObservable } from '@legendapp/state/react';
import { createContext, useContext, useEffect, type ReactNode } from 'react';

// ... (port the full implementation from Telechy)

// Key adaptations:
// 1. Remove MUI-specific classes from keyboard handler
// 2. Update PaneType and PaneId to match OpenCode needs
// 3. Keep the Observable pattern for fine-grained reactivity
// 4. Keep max panes = 4
// 5. Keep singleton logic
// 6. Keep stacking functionality

export const usePanes = () => {
  const context = useContext(PanesContext);
  if (!context) {
    throw new Error('usePanes must be used within a PanesProvider');
  }
  return context;
};
```

### Pane Actions Provider (Port)
```tsx
// context/PaneActionsProvider.tsx
// Port from Telechy - provides context for actions within a pane
// Enables child components to interact with their containing pane
```

### Workspace Layout
```tsx
// components/layout/workspace.tsx
import { observer, use$ } from '@legendapp/state/react';
import { usePanes } from '@/context/PanesProvider';
import { Pane } from '@/components/panes/pane';
import { PaneActionsProvider } from '@/context/PaneActionsProvider';

export const Workspace = observer(function Workspace() {
  const panes$ = usePanes();
  const panes = use$(panes$.panes);
  const totalWidth = panes$.getTotalPaneWidthPercentage();

  return (
    <div
      className="flex gap-2 h-full p-2"
      style={{ width: `${totalWidth}%` }}
    >
      {panes.map((pane) => (
        <PaneActionsProvider key={pane.id}>
          <Pane
            id={pane.id}
            title={pane.title}
            width={100 / panes.length}
            isStacked={pane.components.length > 1}
            onClose={() => panes$.closePane(pane.id)}
            onUnstack={() => panes$.unstackPaneOnce(pane.id)}
          >
            {pane.components.at(-1)}
          </Pane>
        </PaneActionsProvider>
      ))}
    </div>
  );
});
```

## Dependencies
- 04-foundation-core-providers
- 05-ui-primitive-components

## Estimated Effort
1.5 days

## Notes
- Reference: `/context/PanesProvider.tsx` in Telechy
- Reference: `/components/pane.tsx` in Telechy  
- Most complex UI component - test thoroughly
- Consider resize handles between panes (future enhancement)
- 2026-01-01: Added pane components, pane container layout, and close animations with Q shortcut. Files changed: components/panes/pane.tsx, components/panes/pane-container.tsx, components/panes/index.ts, components/ui/context-menu.tsx.
