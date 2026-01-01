'use client'

import { Maximize2, Minimize2, Plus, Settings } from 'lucide-react'

import { ProjectSelector } from '@/components/project-selector'
import { Button } from '@/components/ui/button'
import { usePanes } from '@/context/PanesProvider'
import type { PaneType } from '@/types'

interface HeaderProps {
  isWorkspaceMaximized: boolean
  canToggleWorkspace: boolean
  onToggleWorkspace: () => void
}

const placeholderPane = (title: string) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
    <span className="text-xs uppercase tracking-wide">{title}</span>
    <span>Coming soon</span>
  </div>
)

export function Header({
  isWorkspaceMaximized,
  canToggleWorkspace,
  onToggleWorkspace,
}: HeaderProps) {
  const panes$ = usePanes()

  const openPlaceholderPane = (type: PaneType, title: string) => {
    panes$.openPane({
      type,
      title,
      component: placeholderPane(title),
    })
  }

  const workspaceLabel = isWorkspaceMaximized ? 'Restore workspace' : 'Maximize workspace'

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-4">
          <ProjectSelector />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => openPlaceholderPane('session', 'Session')}
            aria-label="New session"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => openPlaceholderPane('config', 'Configuration')}
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
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
