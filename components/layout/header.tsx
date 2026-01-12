'use client'

import {
  Check,
  ChevronRight,
  FolderOpen,
  GitBranch,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import {
  SessionPane,
  SessionPaneHeaderActions,
  SessionPaneHeaderContent,
} from '@/components/panes/session-pane'
import { ProjectSelector } from '@/components/project-selector'
import { TimeFilterBar } from '@/components/time-filter-bar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useOpenCode } from '@/context/OpenCodeProvider'
import { usePanes } from '@/context/PanesProvider'
import { getActiveProject, useProject } from '@/context/ProjectProvider'
import { useSessionFilter } from '@/context/SessionFilterProvider'
import type { Project } from '@/lib/opencode'
import { cn, type WorktreeItem } from '@/lib/utils'
import { buildSessionKey } from '@/lib/utils/session-key'

interface HeaderProps {
  isWorkspaceMaximized: boolean
  canToggleWorkspace: boolean
  onToggleWorkspace: () => void
}

/** Represents a selectable directory (project or worktree) for creating sessions */
interface SelectableDirectory {
  path: string
  name: string
  displayPath: string
  isWorktree: boolean
  projectId: string
  project: Project
}

export function Header({
  isWorkspaceMaximized,
  canToggleWorkspace,
  onToggleWorkspace,
}: HeaderProps) {
  const { client } = useOpenCode()
  const { currentProject, projects, worktrees, selectedProjectIds } = useProject()
  const panes$ = usePanes()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDirectory, setSelectedDirectory] = useState<SelectableDirectory | null>(null)
  const [sessionTitle, setSessionTitle] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  const { searchTerm, setSearchTerm } = useSessionFilter()
  const activeProject = getActiveProject({ currentProject, projects, selectedProjectIds })
  const workspaceLabel = isWorkspaceMaximized ? 'Restore workspace' : 'Maximize workspace'

  // Build grouped structure: projects with their worktrees
  const projectGroups = useMemo(() => {
    const groups: Array<{
      project: Project
      mainDirectory: SelectableDirectory
      worktreeDirectories: SelectableDirectory[]
    }> = []

    const worktreesByProject = new Map<string, WorktreeItem[]>()
    for (const wt of worktrees) {
      const list = worktreesByProject.get(wt.projectId) ?? []
      list.push(wt)
      worktreesByProject.set(wt.projectId, list)
    }

    for (const project of projects) {
      const projectWorktrees = worktreesByProject.get(project.id) ?? []
      const mainWt = projectWorktrees.find((wt) => !wt.isWorktree)
      if (!mainWt) continue

      const mainDirectory: SelectableDirectory = {
        path: mainWt.path,
        name: mainWt.name,
        displayPath: mainWt.displayPath,
        isWorktree: false,
        projectId: project.id,
        project,
      }

      const worktreeDirectories: SelectableDirectory[] = projectWorktrees
        .filter((wt) => wt.isWorktree)
        .map((wt) => ({
          path: wt.path,
          name: wt.name,
          displayPath: wt.displayPath,
          isWorktree: true,
          projectId: project.id,
          project,
        }))

      groups.push({ project, mainDirectory, worktreeDirectories })
    }

    // Sort by name
    return groups.sort((a, b) => a.mainDirectory.name.localeCompare(b.mainDirectory.name))
  }, [projects, worktrees])

  // Filter by search
  const filteredGroups = useMemo(() => {
    if (!projectSearch.trim()) return projectGroups
    const searchLower = projectSearch.toLowerCase()

    return projectGroups
      .map((group) => {
        const mainMatches =
          group.mainDirectory.name.toLowerCase().includes(searchLower) ||
          group.mainDirectory.path.toLowerCase().includes(searchLower)

        if (mainMatches) return group

        const matchingWorktrees = group.worktreeDirectories.filter(
          (wt) =>
            wt.name.toLowerCase().includes(searchLower) ||
            wt.path.toLowerCase().includes(searchLower),
        )

        if (matchingWorktrees.length === 0) return null

        return { ...group, worktreeDirectories: matchingWorktrees }
      })
      .filter((g): g is NonNullable<typeof g> => g !== null)
  }, [projectGroups, projectSearch])

  const toggleExpanded = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }, [])

  const handleOpenModal = useCallback(() => {
    // Default to active project's main directory
    if (activeProject) {
      const group = projectGroups.find((g) => g.project.id === activeProject.id)
      if (group) {
        setSelectedDirectory(group.mainDirectory)
      }
    } else if (projectGroups.length > 0 && projectGroups[0]) {
      setSelectedDirectory(projectGroups[0].mainDirectory)
    }
    setSessionTitle('')
    setProjectSearch('')
    setCreateError(null)
    setExpandedProjects(new Set())
    setIsModalOpen(true)
  }, [activeProject, projectGroups])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const handleCreateSession = useCallback(async () => {
    if (!client || !selectedDirectory || isCreating) {
      return
    }

    setIsCreating(true)
    setCreateError(null)

    try {
      const title = sessionTitle.trim() || undefined
      const result = await client.session.create(
        { directory: selectedDirectory.path, title },
        { throwOnError: true },
      )

      const newSession = result.data
      if (newSession?.id) {
        const sessionKey = buildSessionKey(selectedDirectory.path, newSession.id)
        const paneContent = <SessionPane sessionKey={sessionKey} autoFocus />
        const headerContent = <SessionPaneHeaderContent sessionKey={sessionKey} />
        const headerActions = <SessionPaneHeaderActions sessionKey={sessionKey} />
        const paneTitle = title || 'New Session'
        const hasSessionPane = panes$.panes.get().some((pane) => pane.id === 'session')

        if (hasSessionPane) {
          panes$.stackPane('session', paneContent, headerContent, headerActions)
          panes$.setPaneTitle('session', paneTitle)
        } else {
          panes$.openPane({
            type: 'session',
            component: paneContent,
            title: paneTitle,
            headerContent,
            headerActions,
          })
        }
        setIsModalOpen(false)
      }
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create session')
    } finally {
      setIsCreating(false)
    }
  }, [client, isCreating, panes$, selectedDirectory, sessionTitle])

  const canOpenModal = Boolean(client && projects.length > 0)
  const canCreateSession = Boolean(selectedDirectory && !isCreating)

  const isDirectorySelected = (dir: SelectableDirectory) => selectedDirectory?.path === dir.path

  return (
    <header className="relative z-10 flex-shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <ProjectSelector />
          <TimeFilterBar />
          <div className="relative w-[200px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sessions..."
              className="h-8 w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
            <Button
              variant="ghost"
              size="icon"
              onPress={handleOpenModal}
              aria-label="New session"
              isDisabled={!canOpenModal}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <DialogContent
              title="New session"
              description="Create a new session in a project or worktree."
            >
              <DialogBody>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Project or Worktree</span>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        placeholder="Search projects & worktrees..."
                        className="h-8 w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                      />
                      {projectSearch ? (
                        <button
                          type="button"
                          onClick={() => setProjectSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    {/* Directory picker */}
                    <div className="max-h-[240px] overflow-auto rounded-md border border-border">
                      {filteredGroups.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                          {projectSearch.trim()
                            ? `No results for "${projectSearch}"`
                            : 'No projects available'}
                        </div>
                      ) : (
                        <div className="py-1">
                          {filteredGroups.map((group) => {
                            const { project, mainDirectory, worktreeDirectories } = group
                            const hasWorktrees = worktreeDirectories.length > 0
                            const isExpanded =
                              expandedProjects.has(project.id) || projectSearch.trim().length > 0

                            return (
                              <div key={project.id}>
                                {/* Project row */}
                                <div className="flex items-center gap-1 px-1">
                                  {/* Expand button */}
                                  {hasWorktrees ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpanded(project.id)}
                                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded hover:bg-secondary/50"
                                    >
                                      <ChevronRight
                                        className={cn(
                                          'h-3.5 w-3.5 text-muted-foreground transition-transform',
                                          isExpanded && 'rotate-90',
                                        )}
                                      />
                                    </button>
                                  ) : (
                                    <div className="w-6 flex-shrink-0" />
                                  )}

                                  {/* Project button */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDirectory(mainDirectory)}
                                    className={cn(
                                      'flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary/50',
                                      isDirectorySelected(mainDirectory) && 'bg-primary/10',
                                    )}
                                  >
                                    {project.icon?.url ? (
                                      <span
                                        className="h-4 w-4 flex-shrink-0 rounded bg-cover bg-center"
                                        style={{ backgroundImage: `url(${project.icon.url})` }}
                                      />
                                    ) : (
                                      <FolderOpen className="h-4 w-4 flex-shrink-0 text-amber-500/80" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-medium text-foreground">
                                          {mainDirectory.name}
                                        </span>
                                        {hasWorktrees && (
                                          <span className="flex items-center gap-0.5 rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                            <GitBranch className="h-2.5 w-2.5" />
                                            {worktreeDirectories.length}
                                          </span>
                                        )}
                                      </div>
                                      <div className="truncate text-xs text-muted-foreground">
                                        {mainDirectory.displayPath}
                                      </div>
                                    </div>
                                    <Check
                                      className={cn(
                                        'h-4 w-4 flex-shrink-0 text-primary transition-opacity',
                                        isDirectorySelected(mainDirectory)
                                          ? 'opacity-100'
                                          : 'opacity-0',
                                      )}
                                    />
                                  </button>
                                </div>

                                {/* Worktrees */}
                                {isExpanded && hasWorktrees && (
                                  <div className="ml-7 border-l border-border/40 py-0.5 pl-2">
                                    {worktreeDirectories.map((wt) => (
                                      <button
                                        key={wt.path}
                                        type="button"
                                        onClick={() => setSelectedDirectory(wt)}
                                        className={cn(
                                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary/50',
                                          isDirectorySelected(wt) && 'bg-primary/10',
                                        )}
                                      >
                                        <GitBranch className="h-3.5 w-3.5 flex-shrink-0 text-cyan-500/70" />
                                        <div className="min-w-0 flex-1">
                                          <div className="truncate text-sm text-foreground">
                                            {wt.name}
                                          </div>
                                          <div className="truncate text-[10px] text-muted-foreground/70">
                                            {wt.displayPath}
                                          </div>
                                        </div>
                                        <Check
                                          className={cn(
                                            'h-4 w-4 flex-shrink-0 text-primary transition-opacity',
                                            isDirectorySelected(wt) ? 'opacity-100' : 'opacity-0',
                                          )}
                                        />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Show selected */}
                    {selectedDirectory && (
                      <div className="flex items-center gap-2 rounded-md bg-secondary/30 px-3 py-2 text-xs">
                        {selectedDirectory.isWorktree ? (
                          <GitBranch className="h-3.5 w-3.5 text-cyan-500" />
                        ) : (
                          <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        <span className="font-medium text-foreground">
                          {selectedDirectory.name}
                        </span>
                        <span className="text-muted-foreground">
                          {selectedDirectory.displayPath}
                        </span>
                      </div>
                    )}
                  </div>

                  <Input
                    label="Title (optional)"
                    value={sessionTitle}
                    onChange={setSessionTitle}
                    placeholder="Untitled session"
                  />
                  {createError && <p className="text-xs text-error">{createError}</p>}
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost" size="sm" onPress={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={handleCreateSession}
                  isDisabled={!canCreateSession}
                >
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="icon"
            onPress={onToggleWorkspace}
            aria-label={workspaceLabel}
            isDisabled={!canToggleWorkspace}
          >
            {isWorkspaceMaximized ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
