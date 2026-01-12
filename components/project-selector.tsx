'use client'

import { Check, ChevronRight, Folder, FolderOpen, GitBranch, Search } from 'lucide-react'
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useOpenCode } from '@/context/OpenCodeProvider'
import { useProject } from '@/context/ProjectProvider'
import type { Project } from '@/lib/opencode'
import { cn, formatProjectLabel, type WorktreeItem } from '@/lib/utils'

const normalizeSearchValue = (value: string): string => value.toLowerCase().replace(/\s+/g, '')

const fuzzyMatch = (query: string, text: string): boolean => {
  const normalizedQuery = normalizeSearchValue(query.trim())
  if (!normalizedQuery) return true
  const normalizedText = normalizeSearchValue(text)
  if (normalizedText.includes(normalizedQuery)) return true
  let lastIndex = -1
  for (const char of normalizedQuery) {
    const index = normalizedText.indexOf(char, lastIndex + 1)
    if (index === -1) return false
    lastIndex = index
  }
  return true
}

interface ProjectGroup {
  project: Project
  mainWorktree: WorktreeItem
  sandboxWorktrees: WorktreeItem[]
}

export function ProjectSelector() {
  const { client } = useOpenCode()
  const {
    projects,
    worktrees,
    selectedProjectIds,
    isLoading,
    selectProject,
    toggleSelectedProject,
    clearSelectedProjects,
    refreshProjects,
  } = useProject()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [customPath, setCustomPath] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isOpenRef = useRef(isOpen)

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setSearchTerm('')
  }, [])

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    if (!isDialogOpen || !fileInputRef.current) return
    fileInputRef.current.setAttribute('webkitdirectory', '')
    fileInputRef.current.setAttribute('directory', '')
  }, [isDialogOpen])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!isOpenRef.current) return
      const container = containerRef.current
      if (!container) return
      const path = event.composedPath()
      if (path.includes(container)) return
      closeDropdown()
    }

    document.addEventListener('pointerdown', handlePointerDown, { capture: true })
    return () => document.removeEventListener('pointerdown', handlePointerDown, { capture: true })
  }, [closeDropdown])

  // Group worktrees by project
  const projectGroups = useMemo<ProjectGroup[]>(() => {
    const groups: ProjectGroup[] = []
    const worktreesByProject = new Map<string, WorktreeItem[]>()

    for (const wt of worktrees) {
      const list = worktreesByProject.get(wt.projectId) ?? []
      list.push(wt)
      worktreesByProject.set(wt.projectId, list)
    }

    for (const project of projects) {
      const projectWorktrees = worktreesByProject.get(project.id) ?? []
      const mainWorktree = projectWorktrees.find((wt) => !wt.isWorktree)
      if (!mainWorktree) continue // Skip if no main worktree (shouldn't happen)

      groups.push({
        project,
        mainWorktree,
        sandboxWorktrees: projectWorktrees.filter((wt) => wt.isWorktree),
      })
    }

    return groups
  }, [projects, worktrees])

  // Filter groups based on search
  const filteredGroups = useMemo<ProjectGroup[]>(() => {
    const query = searchTerm.trim()
    if (!query) return projectGroups

    return projectGroups
      .map((group) => {
        const projectMatches =
          fuzzyMatch(query, group.mainWorktree.name) || fuzzyMatch(query, group.mainWorktree.path)

        if (projectMatches) return group

        const matchingSandboxes = group.sandboxWorktrees.filter(
          (wt) => fuzzyMatch(query, wt.name) || fuzzyMatch(query, wt.path),
        )

        if (matchingSandboxes.length === 0) return null

        return { ...group, sandboxWorktrees: matchingSandboxes }
      })
      .filter((g): g is ProjectGroup => g !== null)
  }, [projectGroups, searchTerm])

  const placeholder = isLoading
    ? 'Loading...'
    : isOpen
      ? 'Search projects & worktrees...'
      : 'Filter projects'

  // Build selection label
  const selectionLabel = useMemo(() => {
    if (selectedProjectIds.length === 0) return 'All projects'
    if (selectedProjectIds.length === 1) {
      const id = selectedProjectIds[0]
      // Check if it's a worktree path
      const wt = worktrees.find((w) => w.id === id)
      if (wt) return wt.name
      // Check if it's a project
      const project = projects.find((p) => p.id === id)
      if (project) return formatProjectLabel(project).name
      return '1 selected'
    }
    return `${selectedProjectIds.length} selected`
  }, [selectedProjectIds, worktrees, projects])

  const displayValue = isOpen ? searchTerm : selectionLabel
  const isAllSelected = selectedProjectIds.length === 0

  const handleSelectProject = (project: Project) => {
    toggleSelectedProject(project.id)
    void selectProject(project.id)
  }

  const handleSelectWorktree = (wt: WorktreeItem) => {
    // For worktrees, we use the worktree ID which includes the path
    toggleSelectedProject(wt.id)
  }

  const handleClearAll = () => {
    clearSelectedProjects()
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    setSearchTerm('')
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
    if (!isOpen) setIsOpen(true)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') closeDropdown()
  }

  const toggleExpanded = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const handleAddProject = async () => {
    const path = customPath.trim()
    if (!path) {
      setAddError('Directory path is required')
      return
    }
    if (!client) {
      setAddError('Connect to a server first')
      return
    }

    setIsAdding(true)
    setAddError(null)

    try {
      const response = await client.project.current({ directory: path }, { throwOnError: true })
      await refreshProjects()
      if (response.data?.id) {
        await selectProject(response.data.id)
      }
      setIsDialogOpen(false)
      setCustomPath('')
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Failed to add project')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDirectoryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const relativePath = file.webkitRelativePath || file.name
    const rootFolder = relativePath.split('/')[0]
    if (rootFolder) {
      setCustomPath(rootFolder)
      setAddError(null)
    }
    event.target.value = ''
  }

  const isProjectSelected = (projectId: string) => selectedProjectIds.includes(projectId)
  const isWorktreeSelected = (wtId: string) => selectedProjectIds.includes(wtId)

  return (
    <div className="flex items-center gap-2">
      <div ref={containerRef} className="relative w-[280px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Project filter"
          aria-expanded={isOpen}
          aria-controls="project-selector-listbox"
          aria-autocomplete="list"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="h-8 w-full rounded-md border border-border bg-background py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        />

        {isOpen && (
          <div
            id="project-selector-listbox"
            role="listbox"
            aria-multiselectable="true"
            className="absolute top-full z-50 mt-1 max-h-[400px] w-full overflow-auto rounded-lg border border-border bg-background shadow-lg"
          >
            {/* All Projects option */}
            <button
              type="button"
              role="option"
              aria-selected={isAllSelected}
              onClick={handleClearAll}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-secondary/50',
                isAllSelected && 'bg-primary/10',
              )}
            >
              <span className="text-sm font-medium text-foreground">All projects</span>
              <Check
                className={cn(
                  'ml-auto h-4 w-4 text-primary transition-opacity',
                  isAllSelected ? 'opacity-100' : 'opacity-0',
                )}
              />
            </button>

            <div className="mx-2 my-1 border-t border-border/50" />

            {/* Project groups */}
            {filteredGroups.length > 0 ? (
              <div className="py-1">
                {filteredGroups.map((group) => {
                  const { project, mainWorktree, sandboxWorktrees } = group
                  const hasWorktrees = sandboxWorktrees.length > 0
                  const isExpanded =
                    expandedProjects.has(project.id) || searchTerm.trim().length > 0
                  const projectSelected = isProjectSelected(project.id)

                  return (
                    <div key={project.id}>
                      {/* Project row */}
                      <div className="flex items-center gap-1 px-2">
                        {/* Expand button */}
                        {hasWorktrees ? (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(project.id)}
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded hover:bg-secondary/50"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
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

                        {/* Project select button */}
                        <button
                          type="button"
                          role="option"
                          aria-selected={projectSelected}
                          onClick={() => handleSelectProject(project)}
                          className={cn(
                            'flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary/50',
                            projectSelected && 'bg-primary/10',
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
                                {mainWorktree.name}
                              </span>
                              {hasWorktrees && (
                                <span className="flex items-center gap-0.5 rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  <GitBranch className="h-2.5 w-2.5" />
                                  {sandboxWorktrees.length}
                                </span>
                              )}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {mainWorktree.displayPath}
                            </div>
                          </div>
                          <Check
                            className={cn(
                              'h-4 w-4 flex-shrink-0 text-primary transition-opacity',
                              projectSelected ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                        </button>
                      </div>

                      {/* Worktrees */}
                      {isExpanded && hasWorktrees && (
                        <div className="ml-8 border-l border-border/40 py-0.5 pl-2">
                          {sandboxWorktrees.map((wt) => {
                            const wtSelected = isWorktreeSelected(wt.id)
                            return (
                              <button
                                key={wt.id}
                                type="button"
                                role="option"
                                aria-selected={wtSelected}
                                onClick={() => handleSelectWorktree(wt)}
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary/50',
                                  wtSelected && 'bg-primary/10',
                                )}
                              >
                                <GitBranch className="h-3.5 w-3.5 flex-shrink-0 text-cyan-500/70" />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm text-foreground">{wt.name}</div>
                                  <div className="truncate text-[10px] text-muted-foreground/70">
                                    {wt.displayPath}
                                  </div>
                                </div>
                                <Check
                                  className={cn(
                                    'h-4 w-4 flex-shrink-0 text-primary transition-opacity',
                                    wtSelected ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : searchTerm.trim() ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No projects or worktrees found.
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Add project dialog */}
      <Dialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Button
          variant="ghost"
          size="icon"
          onPress={() => {
            closeDropdown()
            setAddError(null)
            setCustomPath('')
            setIsDialogOpen(true)
          }}
          aria-label="Add project"
        >
          <Folder className="h-4 w-4" />
        </Button>
        <DialogContent title="Add project" description="Paste the project directory to open it.">
          <DialogBody>
            <div className="space-y-3">
              <Input
                label="Project directory"
                value={customPath}
                onChange={setCustomPath}
                placeholder="/Users/you/path/to/project"
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onPress={() => fileInputRef.current?.click()}>
                  Choose folder
                </Button>
                <span className="text-xs text-muted-foreground">
                  Uses the browser file picker when available.
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                OpenCode will create the project when the directory exists on the server.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleDirectoryChange}
              />
              {addError && <p className="text-xs text-error">{addError}</p>}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onPress={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onPress={handleAddProject} isDisabled={isAdding}>
              {isAdding ? 'Adding...' : 'Add project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
