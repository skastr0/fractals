'use client'

import { Loader2, Maximize2, Minimize2, Plus } from 'lucide-react'
import { useCallback, useState } from 'react'

import { SessionPane } from '@/components/panes/session-pane'
import { ProjectSelector } from '@/components/project-selector'
import { TimeFilterBar } from '@/components/time-filter-bar'
import { Button } from '@/components/ui/button'
import { useOpenCode } from '@/context/OpenCodeProvider'
import { usePanes } from '@/context/PanesProvider'
import { getActiveProject, useProject } from '@/context/ProjectProvider'
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
  const [isCreating, setIsCreating] = useState(false)

  const activeProject = getActiveProject({ currentProject, projects, selectedProjectIds })
  const workspaceLabel = isWorkspaceMaximized ? 'Restore workspace' : 'Maximize workspace'

  const handleNewSession = useCallback(async () => {
    if (!client || !activeProject || isCreating) {
      return
    }

    setIsCreating(true)
    try {
      const result = await client.session.create(
        { directory: activeProject.worktree },
        { throwOnError: true },
      )

      const newSession = result.data
      if (newSession?.id) {
        const sessionKey = buildSessionKey(activeProject.worktree, newSession.id)
        const paneContent = <SessionPane sessionKey={sessionKey} autoFocus />
        const hasSessionPane = panes$.panes.get().some((pane) => pane.id === 'session')

        if (hasSessionPane) {
          panes$.stackPane('session', paneContent)
          panes$.setPaneTitle('session', 'New Session')
        } else {
          panes$.openPane({ type: 'session', component: paneContent, title: 'New Session' })
        }
      }
    } catch (error) {
      console.error('Failed to create session:', error)
    } finally {
      setIsCreating(false)
    }
  }, [activeProject, client, isCreating, panes$])

  const canCreateSession = Boolean(client && activeProject && !isCreating)

  return (
    <header className="relative z-10 flex-shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <ProjectSelector />
          <TimeFilterBar />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => void handleNewSession()}
            aria-label="New session"
            isDisabled={!canCreateSession}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
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
