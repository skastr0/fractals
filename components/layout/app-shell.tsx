'use client'

import { observer, useSelector } from '@legendapp/state/react'
import { useState } from 'react'

import { SessionGraph } from '@/components/graph'
import { PaneContainer } from '@/components/panes'
import { ProjectInfo } from '@/components/project-info'
import { usePanes } from '@/context/PanesProvider'

import { CommandBar } from './command-bar'
import { Header } from './header'
import { StatusBar } from './status-bar'

export const AppShell = observer(function AppShell() {
  const panes$ = usePanes()
  const panes = useSelector(() => panes$.panes.get())
  const totalWidth = useSelector(() => panes$.getTotalPaneWidthPercentage())
  const [isWorkspaceMaximized, setIsWorkspaceMaximized] = useState(false)

  const hasPanes = panes.length > 0
  const workspaceWidth = hasPanes ? (isWorkspaceMaximized ? 100 : totalWidth) : 0
  const graphOpacity = isWorkspaceMaximized ? 0.15 : hasPanes ? 0.7 : 1
  const graphWidth =
    hasPanes && !isWorkspaceMaximized ? `calc(100% - ${workspaceWidth}% - 0.5rem)` : '100%'

  const handleToggleWorkspace = () => {
    if (!hasPanes) {
      return
    }
    setIsWorkspaceMaximized((prev) => !prev)
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-background"
      style={{ minHeight: 'var(--app-height, 100vh)' }}
    >
      <Header
        isWorkspaceMaximized={isWorkspaceMaximized}
        canToggleWorkspace={hasPanes}
        onToggleWorkspace={handleToggleWorkspace}
      />
      <ProjectInfo />

      <main className="relative flex flex-1 overflow-hidden">
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: graphOpacity, width: graphWidth }}
        >
          <div className="h-full w-full border-r border-border/40">
            <SessionGraph />
          </div>
        </div>

        {hasPanes ? (
          <div className="absolute inset-0 flex justify-end">
            <PaneContainer widthOverride={workspaceWidth} />
          </div>
        ) : null}

        <CommandBar mode={hasPanes ? 'left' : 'center'} />
      </main>

      <StatusBar />
    </div>
  )
})
