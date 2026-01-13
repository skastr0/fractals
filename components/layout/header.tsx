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
import { useProject } from '@/context/ProjectProvider'
import { useSessionFilter } from '@/context/SessionFilterProvider'
import { cn } from '@/lib/utils'
import { buildSessionKey } from '@/lib/utils/session-key'

interface HeaderProps {
  isWorkspaceMaximized: boolean
  canToggleWorkspace: boolean
  onToggleWorkspace: () => void
}

/** Simple directory entry for session creation */
interface DirectoryEntry {
  path: string
  name: string
  displayPath: string
}

const getDirectoryName = (path: string): string => {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

const formatDisplayPath = (path: string): string =>
  path.replace(/^\/Users\/[^/]+/, '~').replace(/^C:\\Users\\[^\\]+/i, '~')

export function Header({
  isWorkspaceMaximized,
  canToggleWorkspace,
  onToggleWorkspace,
}: HeaderProps) {
  const { client } = useOpenCode()
  const { projects } = useProject()
  const panes$ = usePanes()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDirectory, setSelectedDirectory] = useState<DirectoryEntry | null>(null)
  const [sessionTitle, setSessionTitle] = useState('')
  const [directorySearch, setDirectorySearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const { searchTerm, setSearchTerm } = useSessionFilter()
  const workspaceLabel = isWorkspaceMaximized ? 'Restore workspace' : 'Maximize workspace'

  // Build flat list of ALL directories
  const allDirectories = useMemo<DirectoryEntry[]>(() => {
    const seen = new Set<string>()
    const entries: DirectoryEntry[] = []

    for (const project of projects) {
      // Add main worktree
      if (project.worktree && !seen.has(project.worktree)) {
        seen.add(project.worktree)
        entries.push({
          path: project.worktree,
          name: project.name || getDirectoryName(project.worktree),
          displayPath: formatDisplayPath(project.worktree),
        })
      }

      // Add all sandboxes
      if (project.sandboxes?.length) {
        for (const sandbox of project.sandboxes) {
          if (!seen.has(sandbox)) {
            seen.add(sandbox)
            entries.push({
              path: sandbox,
              name: getDirectoryName(sandbox),
              displayPath: formatDisplayPath(sandbox),
            })
          }
        }
      }
    }

    return entries.sort((a, b) => a.name.localeCompare(b.name))
  }, [projects])

  // Filter by search
  const filteredDirectories = useMemo(() => {
    if (!directorySearch.trim()) return allDirectories
    const searchLower = directorySearch.toLowerCase()

    return allDirectories.filter(
      (dir) =>
        dir.name.toLowerCase().includes(searchLower) ||
        dir.path.toLowerCase().includes(searchLower),
    )
  }, [allDirectories, directorySearch])

  const handleOpenModal = useCallback(() => {
    // Default to first directory
    if (allDirectories.length > 0 && allDirectories[0]) {
      setSelectedDirectory(allDirectories[0])
    }
    setSessionTitle('')
    setDirectorySearch('')
    setCreateError(null)
    setIsModalOpen(true)
  }, [allDirectories])

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
            <DialogContent title="New session" description="Create a new session in a directory.">
              <DialogBody>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Directory</span>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={directorySearch}
                        onChange={(e) => setDirectorySearch(e.target.value)}
                        placeholder="Search directories..."
                        className="h-8 w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                      />
                      {directorySearch ? (
                        <button
                          type="button"
                          onClick={() => setDirectorySearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    {/* Flat directory picker */}
                    <div className="max-h-[240px] overflow-auto rounded-md border border-border">
                      {filteredDirectories.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                          {directorySearch.trim()
                            ? `No results for "${directorySearch}"`
                            : 'No directories available'}
                        </div>
                      ) : (
                        <div className="py-1">
                          {filteredDirectories.map((dir) => {
                            const isSelected = selectedDirectory?.path === dir.path
                            return (
                              <button
                                key={dir.path}
                                type="button"
                                onClick={() => setSelectedDirectory(dir)}
                                className={cn(
                                  'flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-secondary/50',
                                  isSelected && 'bg-primary/10',
                                )}
                              >
                                <FolderOpen className="h-4 w-4 flex-shrink-0 text-amber-500/80" />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-foreground">
                                    {dir.name}
                                  </div>
                                  <div className="truncate text-xs text-muted-foreground">
                                    {dir.displayPath}
                                  </div>
                                </div>
                                <Check
                                  className={cn(
                                    'h-4 w-4 flex-shrink-0 text-primary transition-opacity',
                                    isSelected ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Show selected */}
                    {selectedDirectory && (
                      <div className="flex items-center gap-2 rounded-md bg-secondary/30 px-3 py-2 text-xs">
                        <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
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
