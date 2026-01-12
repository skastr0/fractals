import type { Project } from '@/lib/opencode'

/**
 * Represents a selectable worktree/sandbox in the UI.
 * Can be either a main project worktree or a git worktree (sandbox).
 */
export interface WorktreeItem {
  /** Unique identifier: projectId for main, or `${projectId}:${path}` for sandboxes */
  id: string
  /** The directory path */
  path: string
  /** Display name extracted from path */
  name: string
  /** Shortened path for display (~ for home) */
  displayPath: string
  /** Parent project ID */
  projectId: string
  /** Whether this is a git worktree (sandbox) vs main project */
  isWorktree: boolean
  /** Parent project reference */
  project: Project
}

/**
 * Extracts the name from a worktree path.
 * For paths like `/Users/foo/Projects/Motion/wt-guilherme-pdec-3155-some-feature`,
 * returns `wt-guilherme-pdec-3155-some-feature`.
 */
const getWorktreeName = (path: string): string => {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

/**
 * Formats a path for display, replacing home directory with ~.
 */
const formatDisplayPath = (path: string): string =>
  path.replace(/^\/Users\/[^/]+/, '~').replace(/^C:\\Users\\[^\\]+/i, '~')

/**
 * Creates a WorktreeItem from a project's main worktree.
 */
const createMainWorktreeItem = (project: Project): WorktreeItem => ({
  id: project.id,
  path: project.worktree,
  name: project.name || getWorktreeName(project.worktree),
  displayPath: formatDisplayPath(project.worktree),
  projectId: project.id,
  isWorktree: false,
  project,
})

/**
 * Creates a WorktreeItem from a sandbox path.
 */
const createSandboxWorktreeItem = (project: Project, sandboxPath: string): WorktreeItem => ({
  id: `${project.id}:${sandboxPath}`,
  path: sandboxPath,
  name: getWorktreeName(sandboxPath),
  displayPath: formatDisplayPath(sandboxPath),
  projectId: project.id,
  isWorktree: true,
  project,
})

/**
 * Extracts all worktrees (main + sandboxes) from a project.
 */
export const getProjectWorktrees = (project: Project): WorktreeItem[] => {
  const items: WorktreeItem[] = [createMainWorktreeItem(project)]

  if (project.sandboxes?.length) {
    for (const sandboxPath of project.sandboxes) {
      // Don't duplicate if sandbox path equals main worktree
      if (sandboxPath !== project.worktree) {
        items.push(createSandboxWorktreeItem(project, sandboxPath))
      }
    }
  }

  return items
}

/**
 * Extracts all worktrees from multiple projects, deduplicating by path.
 */
export const getAllWorktrees = (projects: Project[]): WorktreeItem[] => {
  const seenPaths = new Set<string>()
  const items: WorktreeItem[] = []

  for (const project of projects) {
    for (const worktree of getProjectWorktrees(project)) {
      if (!seenPaths.has(worktree.path)) {
        seenPaths.add(worktree.path)
        items.push(worktree)
      }
    }
  }

  return items
}

/**
 * Builds a map of directory paths to their parent project.
 * Includes both main worktrees and sandboxes.
 */
export const buildDirectoryToProjectMap = (projects: Project[]): Map<string, Project> => {
  const map = new Map<string, Project>()

  for (const project of projects) {
    map.set(project.worktree, project)
    if (project.sandboxes?.length) {
      for (const sandboxPath of project.sandboxes) {
        map.set(sandboxPath, project)
      }
    }
  }

  return map
}

/**
 * Finds the project that owns a given directory path.
 * Checks both main worktrees and sandboxes.
 */
export const findProjectForDirectory = (
  directory: string,
  projects: Project[],
): Project | undefined => {
  for (const project of projects) {
    if (project.worktree === directory) {
      return project
    }
    if (project.sandboxes?.includes(directory)) {
      return project
    }
  }
  return undefined
}

/**
 * Checks if a directory belongs to a project (either main worktree or sandbox).
 */
export const directoryBelongsToProject = (directory: string, project: Project): boolean => {
  if (project.worktree === directory) {
    return true
  }
  return project.sandboxes?.includes(directory) ?? false
}

/**
 * Gets all directories (worktree + sandboxes) for a project.
 */
export const getProjectDirectories = (project: Project): string[] => {
  const directories = [project.worktree]
  if (project.sandboxes?.length) {
    for (const sandbox of project.sandboxes) {
      if (sandbox !== project.worktree) {
        directories.push(sandbox)
      }
    }
  }
  return directories
}

/**
 * Gets all directories for selected projects OR specific worktree paths.
 * Supports mixed selection of full projects and individual worktrees.
 *
 * Selection format:
 * - Project ID (e.g., "abc123") - includes all directories for that project
 * - Worktree path (e.g., "/Users/foo/wt-branch") - includes just that path
 */
export const getSelectedDirectories = (projects: Project[], selectedIds: string[]): Set<string> => {
  const directories = new Set<string>()

  for (const id of selectedIds) {
    // Check if it's a project ID
    const project = projects.find((p) => p.id === id)
    if (project) {
      // Add all directories for this project
      for (const dir of getProjectDirectories(project)) {
        directories.add(dir)
      }
      continue
    }

    // Otherwise treat it as a direct path (worktree path)
    // This allows selecting individual worktrees
    if (id.startsWith('/') || id.includes(':')) {
      // Extract path from composite id like "projectId:/path/to/worktree"
      const pathPart = id.includes(':') ? id.split(':').slice(1).join(':') : id
      directories.add(pathPart)
    }
  }

  return directories
}

/**
 * Check if a project/worktree is a "junk" entry (temp directories, global project, etc.)
 */
export const isJunkWorktree = (path: string): boolean => {
  const EXCLUDE_PATTERNS = [
    /^\/private\/var/i,
    /^\/var\/folders/i,
    /^\/tmp\//i,
    /\/node_modules\//i,
    /^C:\\Windows/i,
    /^C:\\Users\\[^\\]+\\AppData\\Local\\Temp/i,
    /^\/$/, // Global "/" project
  ]
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(path))
}

/**
 * Filter out junk worktrees from a list.
 */
export const filterJunkWorktrees = (worktrees: WorktreeItem[]): WorktreeItem[] => {
  return worktrees.filter((wt) => !isJunkWorktree(wt.path))
}
