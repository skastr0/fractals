'use client'

import { observer, useSelector } from '@legendapp/state/react'
import { useState } from 'react'

import { SessionGraph } from '@/components/graph'
import { PaneContainer } from '@/components/panes'
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
  const mainClassName = `relative flex min-h-0 flex-1 overflow-hidden${hasPanes ? ' gap-2' : ''}`

  const handleToggleWorkspace = () => {
    if (!hasPanes) {
      return
    }
    setIsWorkspaceMaximized((prev) => !prev)
  }

  return (
    <div
      className="flex h-screen max-h-screen flex-col overflow-hidden bg-background"
      style={{ height: 'var(--app-height, 100vh)' }}
    >
      <Header
        isWorkspaceMaximized={isWorkspaceMaximized}
        canToggleWorkspace={hasPanes}
        onToggleWorkspace={handleToggleWorkspace}
      />
      <main className={mainClassName}>
        <div
          className="min-h-0 min-w-0 flex-1 transition-opacity duration-300"
          style={{ opacity: graphOpacity }}
        >
          <div className="h-full w-full border-r border-border/40">
            <SessionGraph />
          </div>
        </div>

        {hasPanes ? (
          <div
            className="h-full min-h-0 flex-shrink-0 transition-[width] duration-300"
            style={{ width: `${workspaceWidth}%` }}
          >
            <PaneContainer widthOverride={workspaceWidth} />
          </div>
        ) : null}

        <CommandBar mode={hasPanes ? 'left' : 'center'} />
      </main>

      <StatusBar />
    </div>
  )
})
