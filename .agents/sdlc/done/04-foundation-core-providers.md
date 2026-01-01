# Core Context Providers

## Context
Establish the React context provider hierarchy that will manage global application state. This includes server connection, project selection, pane management, and focus tracking. Following Telechy's patterns, use Legend State for observable state management.

This work enables state sharing across all components and provides the foundation for UI coordination.

## Acceptance Criteria
- [x] OpenCodeProvider - manages SDK client and server connection
- [x] ProjectProvider - manages current project selection
- [x] PanesProvider - port from Telechy for pane management
- [x] FocusManagerProvider - port from Telechy for keyboard navigation
- [x] SyncProvider - manages SSE subscription and reactive data cache
- [x] Provider composition in root layout
- [x] TypeScript types exported for all contexts
- [x] Hooks for consuming each context (useOpenCode, useProject, etc.)

## Technical Guidance

### Provider Hierarchy
```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OpenCodeProvider>
          <ProjectProvider>
            <SyncProvider>
              <PanesProvider>
                <FocusManagerProvider>
                  {children}
                </FocusManagerProvider>
              </PanesProvider>
            </SyncProvider>
          </ProjectProvider>
        </OpenCodeProvider>
      </body>
    </html>
  );
}
```

### OpenCodeProvider
```tsx
// context/OpenCodeProvider.tsx
'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { createClient, checkServerHealth, type OpencodeClient, type ServerHealth } from '@/lib/opencode';

interface OpenCodeContextValue {
  client: OpencodeClient | null;
  health: ServerHealth | null;
  isConnecting: boolean;
  connect: (url?: string) => Promise<void>;
  disconnect: () => void;
}

const OpenCodeContext = createContext<OpenCodeContextValue | null>(null);

export function OpenCodeProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<OpencodeClient | null>(null);
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = async (url?: string) => {
    setIsConnecting(true);
    try {
      const serverHealth = await checkServerHealth(url);
      setHealth(serverHealth);
      if (serverHealth.connected) {
        setClient(createClient({ baseUrl: url }));
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setClient(null);
    setHealth(null);
  };

  // Auto-connect on mount
  useEffect(() => {
    connect();
  }, []);

  return (
    <OpenCodeContext.Provider value={{ client, health, isConnecting, connect, disconnect }}>
      {children}
    </OpenCodeContext.Provider>
  );
}

export function useOpenCode() {
  const context = useContext(OpenCodeContext);
  if (!context) throw new Error('useOpenCode must be used within OpenCodeProvider');
  return context;
}
```

### ProjectProvider
```tsx
// context/ProjectProvider.tsx
'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useObservable, use$ } from '@legendapp/state/react';
import type { Project } from '@/lib/opencode';
import { useOpenCode } from './OpenCodeProvider';

interface ProjectContextValue {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  selectProject: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { client } = useOpenCode();
  const state$ = useObservable({
    projects: [] as Project[],
    currentProject: null as Project | null,
    isLoading: false,
  });

  const refreshProjects = useCallback(async () => {
    if (!client) return;
    state$.isLoading.set(true);
    try {
      const result = await client.project.list();
      state$.projects.set(result.data);
    } finally {
      state$.isLoading.set(false);
    }
  }, [client, state$]);

  const selectProject = useCallback(async (projectId: string) => {
    const project = state$.projects.peek().find(p => p.id === projectId);
    if (project) {
      state$.currentProject.set(project);
    }
  }, [state$]);

  const projects = use$(state$.projects);
  const currentProject = use$(state$.currentProject);
  const isLoading = use$(state$.isLoading);

  return (
    <ProjectContext.Provider value={{ projects, currentProject, isLoading, selectProject, refreshProjects }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
}
```

### PanesProvider (Port from Telechy)
Reference: `/Users/guilhermecastro/Projects/Telechy/entele-forge-tauri/context/PanesProvider.tsx`

Key changes for OpenCode UI:
- Update PaneType to: `'session' | 'config' | 'project' | 'agent' | 'metadata'`
- Keep the observable pattern with Legend State
- Keep singleton pane logic
- Keep stacking/unstacking functionality

### FocusManagerProvider (Port from Telechy)
Reference: `/Users/guilhermecastro/Projects/Telechy/entele-forge-tauri/context/FocusManagerProvider.tsx`

Adapt focus areas for OpenCode UI:
- `'graph'` - session tree focus
- `'pane'` - any pane focus
- `'input'` - message input focus
- `'dialog'` - modal dialog focus

## Dependencies
- 01-foundation-project-setup
- 02-foundation-react-aria-tailwind
- 03-foundation-opencode-sdk

## Estimated Effort
1.5 days

## Notes
- Legend State enables fine-grained reactivity without full re-renders
- SyncProvider handles SSE - detailed in separate work item
- Consider using Zustand as simpler alternative to Legend State if team prefers
- 2025-12-31: Implemented core providers and layout wiring. Files: context/OpenCodeProvider.tsx, context/ProjectProvider.tsx, context/SyncProvider.tsx, context/PanesProvider.tsx, context/FocusManagerProvider.tsx, context/index.tsx, app/layout.tsx.
