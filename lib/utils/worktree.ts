import type { Project } from '@/lib/opencode'

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
 * Gets all directories for selected paths.
 * Supports both project IDs (includes all directories for that project) and direct paths.
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

    // Otherwise treat it as a direct path
    if (id.startsWith('/') || id.includes(':')) {
      // Extract path from composite id like "projectId:/path/to/worktree"
      const pathPart = id.includes(':') ? id.split(':').slice(1).join(':') : id
      directories.add(pathPart)
    }
  }

  return directories
}

/**
 * Check if a path is a "junk" entry (temp directories, global project, etc.)
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
 * Builds a map of directory paths to their parent project.
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
