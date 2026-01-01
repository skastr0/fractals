'use client'

import { FolderOpen, Plus } from 'lucide-react'
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectItem } from '@/components/ui/select'
import { useOpenCode } from '@/context/OpenCodeProvider'
import { useProject } from '@/context/ProjectProvider'
import type { Project } from '@/lib/opencode'

const projectBaseName = (worktree: string): string => {
  const parts = worktree.split(/[/\\]/)
  return parts[parts.length - 1] || worktree
}

const formatProjectName = (project: Project): string =>
  project.name ?? projectBaseName(project.worktree)

const formatProjectPath = (project: Project): string =>
  project.worktree.replace(/^\/Users\/[^/]+/, '~').replace(/^C:\\Users\\[^\\]+/i, '~')

export function ProjectSelector() {
  const { client } = useOpenCode()
  const { projects, currentProject, isLoading, selectProject, refreshProjects } = useProject()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [customPath, setCustomPath] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isDialogOpen || !fileInputRef.current) {
      return
    }

    fileInputRef.current.setAttribute('webkitdirectory', '')
    fileInputRef.current.setAttribute('directory', '')
  }, [isDialogOpen])

  const placeholder = isLoading ? 'Loading projects...' : 'Select project'

  const projectItems = useMemo(() => projects, [projects])

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
      <Select
        aria-label="Project"
        items={projectItems}
        className="w-[260px]"
        placeholder={placeholder}
        selectedKey={currentProject?.id}
        isDisabled={isLoading || projectItems.length === 0}
        onSelectionChange={(key) => {
          if (!key) {
            return
          }
          void selectProject(String(key))
        }}
      >
        {(project) => (
          <SelectItem id={project.id} textValue={formatProjectName(project)}>
            <div className="flex items-center gap-2">
              {project.icon?.url ? (
                <span
                  className="h-4 w-4 rounded bg-cover bg-center"
                  style={{ backgroundImage: `url(${project.icon.url})` }}
                  aria-hidden="true"
                />
              ) : (
                <FolderOpen
                  className="h-4 w-4"
                  style={{ color: project.icon?.color ?? 'currentColor' }}
                />
              )}
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">
                  {formatProjectName(project)}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {formatProjectPath(project)}
                </span>
              </div>
            </div>
          </SelectItem>
        )}
      </Select>

      <Dialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Button
          variant="ghost"
          size="icon"
          onPress={() => {
            setAddError(null)
            setCustomPath('')
            setIsDialogOpen(true)
          }}
          aria-label="Add project"
        >
          <Plus className="h-4 w-4" />
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
