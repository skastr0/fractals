import type { Project } from '@/lib/opencode'

export interface ProjectLabel {
  name: string
  path: string | null
  label: string
  /** True if the directory is a git worktree (sandbox) rather than the main project */
  isWorktree: boolean
  /** The worktree/directory name if this is a sandbox */
  worktreeName: string | null
}

const projectBaseName = (worktree: string): string => {
  const parts = worktree.split(/[/\\]/)
  return parts[parts.length - 1] || worktree
}

const formatProjectPath = (path: string): string =>
  path.replace(/^\/Users\/[^/]+/, '~').replace(/^C:\\Users\\[^\\]+/i, '~')

/**
 * Formats a project label, with awareness of worktrees/sandboxes.
 *
 * @param project - The project (may be undefined if directory doesn't match a known project)
 * @param directory - The session's working directory (may differ from project.worktree for sandboxes)
 */
export const formatProjectLabel = (
  project?: Project | null,
  directory?: string | null,
): ProjectLabel => {
  const effectiveDir = directory ?? project?.worktree ?? ''
  const mainWorktree = project?.worktree ?? ''

  // Check if this is a sandbox (directory differs from main worktree)
  const isWorktree = Boolean(
    project && directory && directory !== mainWorktree && project.sandboxes?.includes(directory),
  )

  // For worktrees, show the worktree name; for main projects, show project name
  const worktreeName = isWorktree ? projectBaseName(effectiveDir) : null
  const projectName = project?.name ?? (mainWorktree ? projectBaseName(mainWorktree) : 'Unknown')

  // Name: For worktrees, show "worktree-name"; for main, show project name
  const name = worktreeName ?? projectName

  // Path: Show the actual directory path
  const path = effectiveDir ? formatProjectPath(effectiveDir) : null

  // Label: For worktrees, show "projectName / worktreeName"; for main, just project name
  const label = isWorktree ? `${projectName} / ${worktreeName}` : path ? `${name} - ${path}` : name

  return { name, path, label, isWorktree, worktreeName }
}
