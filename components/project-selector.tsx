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
import type { Project } from '@/lib/opencode'
import { formatProjectLabel } from '@/lib/utils'

const normalizeSearchValue = (value: string): string => value.toLowerCase().replace(/\s+/g, '')

const fuzzyMatch = (query: string, text: string): boolean => {
  const normalizedQuery = normalizeSearchValue(query.trim())
  if (!normalizedQuery) {
    return true
  }
  const normalizedText = normalizeSearchValue(text)
  if (normalizedText.includes(normalizedQuery)) {
    return true
  }
  let lastIndex = -1
  for (const char of normalizedQuery) {
    const index = normalizedText.indexOf(char, lastIndex + 1)
    if (index === -1) {
      return false
    }
    lastIndex = index
  }
  return true
}

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
    if (!isDialogOpen || !fileInputRef.current) {
      return
    }

    fileInputRef.current.setAttribute('webkitdirectory', '')
    fileInputRef.current.setAttribute('directory', '')
  }, [isDialogOpen])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!isOpenRef.current) {
        return
      }
      const container = containerRef.current
      if (!container) {
        return
      }
      const path = event.composedPath()
      if (path.includes(container)) {
        return
      }
      closeDropdown()
    }

    document.addEventListener('pointerdown', handlePointerDown, { capture: true })
    return () => document.removeEventListener('pointerdown', handlePointerDown, { capture: true })
  }, [closeDropdown])

  const placeholder = isLoading
    ? 'Loading projects...'
    : isOpen
      ? 'Search projects...'
      : 'Filter projects'

  const filteredProjects = useMemo<Project[]>(() => {
    const query = searchTerm.trim()
    if (!query) {
      return projects
    }

    return projects.filter((project) => {
      const name = formatProjectLabel(project).name
      const path = project.worktree
      return fuzzyMatch(query, name) || fuzzyMatch(query, path)
    })
  }, [projects, searchTerm])

  const selectedProjects = useMemo<Project[]>(() => {
    if (selectedProjectIds.length === 0) {
      return []
    }
    const selectedSet = new Set(selectedProjectIds)
    return projects.filter((project) => selectedSet.has(project.id))
  }, [projects, selectedProjectIds])

  const selectionLabel = useMemo(() => {
    if (selectedProjectIds.length === 0) {
      return 'All projects'
    }
    if (selectedProjects.length === 1) {
      const project = selectedProjects[0]
      if (project) {
        return formatProjectLabel(project).name
      }
      return '1 project'
    }
    if (selectedProjects.length > 1) {
      return `${selectedProjects.length} projects`
    }
    return `${selectedProjectIds.length} projects`
  }, [selectedProjectIds.length, selectedProjects])

  const displayValue = isOpen ? searchTerm : selectionLabel
  const isAllSelected = selectedProjectIds.length === 0

  const handleToggle = (project: Project) => {
    const isSelected = selectedProjectIds.includes(project.id)
    toggleSelectedProject(project.id)
    if (!isSelected) {
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
    if (!isOpen) {
      setIsOpen(true)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      closeDropdown()
    }
  }

  const handleAddProject = async () => {
    const path = customPath.trim()
    if (!path) {
      setAddError('Directory path is required')
      return
    }

    if (!client) {
      setAddError('Connect to a server before adding a project')
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
    if (!file) {
      return
    }

    const relativePath = file.webkitRelativePath || file.name
    const rootFolder = relativePath.split('/')[0]
    if (rootFolder) {
      setCustomPath(rootFolder)
      setAddError(null)
    }

    event.target.value = ''
  }

  return (
    <div className="flex items-center gap-2">
      <div ref={containerRef} className="relative w-[260px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Project"
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
        {isOpen ? (
          <div
            id="project-selector-listbox"
            role="listbox"
            aria-multiselectable="true"
            className="absolute top-full z-50 mt-1 max-h-[300px] w-full overflow-auto rounded-lg border border-border bg-background shadow-lg"
          >
            <button
              type="button"
              role="option"
              aria-selected={isAllSelected}
              onClick={handleClearAll}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 ${
                isAllSelected ? 'bg-primary/10' : ''
              }`}
            >
              <span className="text-sm font-medium text-foreground">All projects</span>
              <Check
                className={`ml-auto h-4 w-4 text-primary ${
                  isAllSelected ? 'opacity-100' : 'opacity-0'
                }`}
                aria-hidden="true"
              />
            </button>
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => {
                const isSelected = selectedProjectIds.includes(project.id)
                const { name, path } = formatProjectLabel(project)
                return (
                  <button
                    key={project.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleToggle(project)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 ${
                      isSelected ? 'bg-primary/10' : ''
                    }`}
                  >
                    {project.icon?.url ? (
                      <span
                        className="h-4 w-4 flex-shrink-0 rounded bg-cover bg-center"
                        style={{ backgroundImage: `url(${project.icon.url})` }}
                        aria-hidden="true"
                      />
                    ) : (
                      <FolderOpen
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: project.icon?.color ?? 'currentColor' }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {path ?? project.worktree}
                      </div>
                    </div>
                    <Check
                      className={`ml-auto h-4 w-4 text-primary ${
                        isSelected ? 'opacity-100' : 'opacity-0'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                )
              })
            ) : searchTerm.trim().length > 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No projects found.</div>
            ) : null}
          </div>
        ) : null}
      </div>

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
              {addError ? <p className="text-xs text-error">{addError}</p> : null}
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
