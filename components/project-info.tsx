'use client'

import { Clock, FolderOpen, GitBranch } from 'lucide-react'

import { useProject } from '@/context/ProjectProvider'
import { formatRelativeTime } from '@/lib/utils/date'

const projectBaseName = (worktree: string): string => {
  const parts = worktree.split(/[/\\]/)
  return parts[parts.length - 1] || worktree
}

const formatProjectPath = (worktree: string): string =>
  worktree.replace(/^\/Users\/[^/]+/, '~').replace(/^C:\\Users\\[^\\]+/i, '~')

export function ProjectInfo() {
  const { currentProject } = useProject()

  if (!currentProject) {
    return null
  }

  const name = currentProject.name ?? projectBaseName(currentProject.worktree)
  const path = formatProjectPath(currentProject.worktree)

  return (
    <div className="border-b border-border bg-background/95 px-4 py-2">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{name}</span>
        <span className="truncate text-xs text-muted-foreground">{path}</span>
      </div>
      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(currentProject.time.updated)}
        </span>
        {currentProject.vcs === 'git' ? (
          <span className="flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            git
          </span>
        ) : null}
      </div>
    </div>
  )
}
