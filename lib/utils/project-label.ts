import type { Project } from '@/lib/opencode'

export interface ProjectLabel {
  name: string
  path: string | null
  label: string
}

const projectBaseName = (worktree: string): string => {
  const parts = worktree.split(/[/\\]/)
  return parts[parts.length - 1] || worktree
}

const formatProjectPath = (worktree: string): string =>
  worktree.replace(/^\/Users\/[^/]+/, '~').replace(/^C:\\Users\\[^\\]+/i, '~')

export const formatProjectLabel = (
  project?: Project | null,
  directory?: string | null,
): ProjectLabel => {
  const worktree = project?.worktree ?? directory ?? ''
  const name = project?.name ?? (worktree ? projectBaseName(worktree) : 'Unknown project')
  const path = worktree ? formatProjectPath(worktree) : null
  const label = path ? `${name} - ${path}` : name

  return { name, path, label }
}
