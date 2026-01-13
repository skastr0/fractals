'use client'

import { Check, Folder, FolderOpen, Search } from 'lucide-react'
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
import { cn } from '@/lib/utils'

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

/** A flat directory entry - no hierarchy */
interface DirectoryEntry {
  /** Unique ID for selection (path-based) */
  id: string
  /** The directory path */
  path: string
  /** Display name (folder name) */
  name: string
  /** Shortened path for display */
  displayPath: string
}

const getDirectoryName = (path: string): string => {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

const formatDisplayPath = (path: string): string =>
  path.replace(/^\/Users\/[^/]+/, '~').replace(/^C:\\Users\\[^\\]+/i, '~')

export function ProjectSelector() {
  const { client } = useOpenCode()
  const {
    projects,
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

  // Build flat list of ALL directories from all projects
  const allDirectories = useMemo<DirectoryEntry[]>(() => {
    const seen = new Set<string>()
    const entries: DirectoryEntry[] = []

    for (const project of projects) {
      // Add main worktree
      if (project.worktree && !seen.has(project.worktree)) {
        seen.add(project.worktree)
        entries.push({
          id: project.worktree,
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
              id: sandbox,
              path: sandbox,
              name: getDirectoryName(sandbox),
              displayPath: formatDisplayPath(sandbox),
            })
          }
        }
      }
    }

    // Sort alphabetically by name
    return entries.sort((a, b) => a.name.localeCompare(b.name))
  }, [projects])

  // Filter by search
  const filteredDirectories = useMemo(() => {
    const query = searchTerm.trim()
    if (!query) return allDirectories

    return allDirectories.filter(
      (dir) => fuzzyMatch(query, dir.name) || fuzzyMatch(query, dir.path),
    )
  }, [allDirectories, searchTerm])

  const placeholder = isLoading
    ? 'Loading...'
    : isOpen
      ? 'Search directories...'
      : 'Filter by directory'

  // Build selection label
  const selectionLabel = useMemo(() => {
    if (selectedProjectIds.length === 0) return 'All directories'
    if (selectedProjectIds.length === 1) {
      const id = selectedProjectIds[0]
      const dir = allDirectories.find((d) => d.id === id)
      if (dir) return dir.name
      return '1 selected'
    }
    return `${selectedProjectIds.length} selected`
  }, [selectedProjectIds, allDirectories])

  const displayValue = isOpen ? searchTerm : selectionLabel
  const isAllSelected = selectedProjectIds.length === 0

  const handleSelectDirectory = (dir: DirectoryEntry) => {
    toggleSelectedProject(dir.id)
    // Also set as current project if it matches a project
    const project = projects.find((p) => p.worktree === dir.path)
    if (project) {
      void selectProject(project.id)
    }
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

  const isDirectorySelected = (id: string) => selectedProjectIds.includes(id)

  return (
    <div className="flex items-center gap-2">
      <div ref={containerRef} className="relative w-[280px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Directory filter"
          aria-expanded={isOpen}
          aria-controls="directory-selector-listbox"
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
            id="directory-selector-listbox"
            role="listbox"
            aria-multiselectable="true"
            className="absolute top-full z-50 mt-1 max-h-[400px] w-full overflow-auto rounded-lg border border-border bg-background shadow-lg"
          >
            {/* All option */}
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
              <span className="text-sm font-medium text-foreground">All directories</span>
              <Check
                className={cn(
                  'ml-auto h-4 w-4 text-primary transition-opacity',
                  isAllSelected ? 'opacity-100' : 'opacity-0',
                )}
              />
            </button>

            <div className="mx-2 my-1 border-t border-border/50" />

            {/* Flat directory list */}
            {filteredDirectories.length > 0 ? (
              <div className="py-1">
                {filteredDirectories.map((dir) => {
                  const isSelected = isDirectorySelected(dir.id)
                  return (
                    <button
                      key={dir.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectDirectory(dir)}
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
            ) : searchTerm.trim() ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No directories found.
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
