'use client'

import { Check, FolderOpen, Loader2, Maximize2, Minimize2, Plus, Search, X } from 'lucide-react'
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
import { formatProjectLabel } from '@/lib/utils'
import { buildSessionKey } from '@/lib/utils/session-key'

interface HeaderProps {
  isWorkspaceMaximized: boolean
  canToggleWorkspace: boolean
  onToggleWorkspace: () => void
}

export function Header({
  isWorkspaceMaximized,
  canToggleWorkspace,
  onToggleWorkspace,
}: HeaderProps) {
  const { client } = useOpenCode()
  const { currentProject, projects, selectedProjectIds } = useProject()
  const panes$ = usePanes()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [sessionTitle, setSessionTitle] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const { searchTerm, setSearchTerm } = useSessionFilter()
  const activeProject = getActiveProject({ currentProject, projects, selectedProjectIds })
  const workspaceLabel = isWorkspaceMaximized ? 'Restore workspace' : 'Maximize workspace'

  const sortedProjects = useMemo(
    () =>
      [...projects].sort((a, b) =>
        formatProjectLabel(a).name.localeCompare(formatProjectLabel(b).name),
      ),
    [projects],
  )

  // Filter projects by search term
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) {
      return sortedProjects
    }
    const searchLower = projectSearch.toLowerCase()
    return sortedProjects.filter((project) => {
      const { name, path } = formatProjectLabel(project)
      return (
        name.toLowerCase().includes(searchLower) ||
        (path?.toLowerCase().includes(searchLower) ?? false) ||
        project.worktree.toLowerCase().includes(searchLower)
      )
    })
  }, [sortedProjects, projectSearch])

  const handleOpenModal = useCallback(() => {
    setSelectedProject(activeProject)
    setSessionTitle('')
    setProjectSearch('')
    setCreateError(null)
    setIsModalOpen(true)
  }, [activeProject])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const handleCreateSession = useCallback(async () => {
    if (!client || !selectedProject || isCreating) {
      return
    }

    setIsCreating(true)
    setCreateError(null)

    try {
      const title = sessionTitle.trim() || undefined
      const result = await client.session.create(
        { directory: selectedProject.worktree, title },
        { throwOnError: true },
      )

      const newSession = result.data
      if (newSession?.id) {
        const sessionKey = buildSessionKey(selectedProject.worktree, newSession.id)
        const paneContent = <SessionPane sessionKey={sessionKey} autoFocus />
        const headerContent = <SessionPaneHeaderContent sessionKey={sessionKey} />
        const headerActions = <SessionPaneHeaderActions sessionKey={sessionKey} />
        const paneTitle = title || 'New Session'
        const hasSessionPane = panes$.panes.get().some((pane) => pane.id === 'session')

        if (hasSessionPane) {
          panes$.stackPane('session', paneContent)
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
  }, [client, isCreating, panes$, selectedProject, sessionTitle])

  const canOpenModal = Boolean(client && projects.length > 0)
  const canCreateSession = Boolean(selectedProject && !isCreating)

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
            <DialogContent title="New session" description="Create a new session in a project.">
              <DialogBody>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Project</span>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        placeholder="Search projects..."
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
                    <div className="max-h-[200px] space-y-1 overflow-auto rounded-md border border-border p-1">
                      {filteredProjects.length === 0 ? (
                        <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                          No projects match "{projectSearch}"
                        </div>
                      ) : null}
                      {filteredProjects.map((project) => {
                        const isSelected = selectedProject?.id === project.id
                        const { name, path } = formatProjectLabel(project)
                        return (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => setSelectedProject(project)}
                            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-secondary/50 ${
                              isSelected ? 'bg-primary/10' : ''
                            }`}
                          >
                            {project.icon?.url ? (
                              <span
                                className="h-4 w-4 flex-shrink-0 rounded bg-cover bg-center"
                                style={{ backgroundImage: `url(${project.icon.url})` }}
                              />
                            ) : (
                              <FolderOpen
                                className="h-4 w-4 flex-shrink-0"
                                style={{ color: project.icon?.color ?? 'currentColor' }}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-foreground">
                                {name}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {path ?? project.worktree}
                              </div>
                            </div>
                            <Check
                              className={`ml-auto h-4 w-4 text-primary ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                            />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <Input
                    label="Title (optional)"
                    value={sessionTitle}
                    onChange={setSessionTitle}
                    placeholder="Untitled session"
                  />
                  {createError ? <p className="text-xs text-error">{createError}</p> : null}
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
