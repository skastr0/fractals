# Project Selection

## Context
Allow users to select which project (directory) to work with. Projects in OpenCode are directories that have been opened. The UI needs a dropdown for recent projects plus fallback to file picker for new directories.

## Acceptance Criteria
- [x] ProjectSelector dropdown component
- [x] List recent projects from OpenCode API
- [x] Show project name/icon if configured
- [x] Display project path/worktree
- [x] File picker fallback for new directories
- [x] Recent projects sorted by last updated
- [x] Project switch updates all UI state
- [x] Persist last selected project

## Technical Guidance

### Project Selector Component
```tsx
// components/project-selector.tsx
import { useState } from 'react';
import { Select, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useProject } from '@/context/ProjectProvider';
import { useOpenCode } from '@/context/OpenCodeProvider';
import { FolderOpen, Plus, ChevronDown } from 'lucide-react';
import type { Project } from '@/lib/opencode';

export function ProjectSelector() {
  const { client } = useOpenCode();
  const { projects, currentProject, selectProject, refreshProjects } = useProject();
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenDirectory = async () => {
    // Use Tauri's file picker if available, otherwise browser input
    if (window.__TAURI__) {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Directory',
      });
      if (selected) {
        // Initialize project with OpenCode
        await client?.project.update({ projectID: selected as string });
        await refreshProjects();
      }
    }
  };

  const formatProjectName = (project: Project) => {
    if (project.name) return project.name;
    // Extract folder name from path
    const parts = project.worktree.split('/');
    return parts[parts.length - 1] || project.worktree;
  };

  const formatProjectPath = (project: Project) => {
    const home = process.env.HOME ?? '~';
    return project.worktree.replace(home, '~');
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label="Select project"
        selectedKey={currentProject?.id}
        onSelectionChange={(key) => selectProject(key as string)}
        items={projects}
      >
        {(project) => (
          <SelectItem key={project.id} textValue={formatProjectName(project)}>
            <div className="flex items-center gap-2">
              {project.icon?.url ? (
                <img src={project.icon.url} className="h-4 w-4 rounded" />
              ) : (
                <FolderOpen 
                  className="h-4 w-4" 
                  style={{ color: project.icon?.color }}
                />
              )}
              <div className="flex flex-col">
                <span className="font-medium">{formatProjectName(project)}</span>
                <span className="text-xs text-muted-foreground">
                  {formatProjectPath(project)}
                </span>
              </div>
            </div>
          </SelectItem>
        )}
      </Select>

      <Button
        variant="ghost"
        size="icon"
        onPress={handleOpenDirectory}
        aria-label="Open new directory"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

### Enhanced Project Provider
```tsx
// context/ProjectProvider.tsx (additions)
import { useEffect } from 'react';

// Add to ProjectProvider:
useEffect(() => {
  // Load projects on mount
  refreshProjects();
}, [client]);

useEffect(() => {
  // Restore last selected project from localStorage
  const lastProjectId = localStorage.getItem('opencode-last-project');
  if (lastProjectId && state$.projects.peek().find(p => p.id === lastProjectId)) {
    selectProject(lastProjectId);
  } else if (state$.projects.peek().length > 0) {
    // Default to most recently updated project
    const sorted = [...state$.projects.peek()].sort(
      (a, b) => b.time.updated - a.time.updated
    );
    selectProject(sorted[0].id);
  }
}, [state$.projects]);

// Persist selection
useEffect(() => {
  const current = state$.currentProject.peek();
  if (current) {
    localStorage.setItem('opencode-last-project', current.id);
  }
}, [state$.currentProject]);
```

### Project Info Display
```tsx
// components/project-info.tsx
import { useProject } from '@/context/ProjectProvider';
import { FolderOpen, GitBranch, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/date';

export function ProjectInfo() {
  const { currentProject } = useProject();

  if (!currentProject) return null;

  return (
    <div className="flex flex-col gap-1 px-4 py-2 border-b border-border">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {currentProject.name ?? currentProject.worktree.split('/').pop()}
        </span>
      </div>
      
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(currentProject.time.updated)}
        </span>
        
        {currentProject.vcs === 'git' && (
          <span className="flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            git
          </span>
        )}
      </div>
    </div>
  );
}
```

### Date Formatting Utility
```tsx
// lib/utils/date.ts
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}
```

## Dependencies
- 04-foundation-core-providers
- 05-ui-primitive-components
- 10-connection-server-management

## Estimated Effort
1 day

## Notes
- Projects are identified by their worktree path
- OpenCode auto-creates projects when directories are opened
- Consider adding project color/icon customization
- 2025-12-31: Built ProjectSelector and ProjectInfo components, added recent sorting and localStorage persistence, plus add-project dialog.
