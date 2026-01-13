import type { Project } from '@/lib/opencode'

export interface ProjectLabel {
  name: string
  path: string | null
  label: string
}

const projectBaseName = (path: string): string => {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

const formatProjectPath = (path: string): string =>
  path.replace(/^\/Users\/[^/]+/, '~').replace(/^C:\\Users\\[^\\]+/i, '~')

/**
 * Formats a project/directory label.
 *
 * @param project - The project (may be undefined if directory doesn't match a known project)
 * @param directory - The session's working directory
 */
export const formatProjectLabel = (
  project?: Project | null,
  directory?: string | null,
): ProjectLabel => {
  const effectiveDir = directory ?? project?.worktree ?? ''

  // Name: project name if available, otherwise directory name
  const name = project?.name ?? (effectiveDir ? projectBaseName(effectiveDir) : 'Unknown')

  // Path: Show the actual directory path
  const path = effectiveDir ? formatProjectPath(effectiveDir) : null

  // Label: name with path
  const label = path ? `${name} - ${path}` : name

  return { name, path, label }
}
