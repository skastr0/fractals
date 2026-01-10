'use client'

import { use$ } from '@legendapp/state/react'
import { useCallback, useState } from 'react'

import { SessionGraph } from '@/components/graph'
import { CommandPalette } from '@/components/layout/command-palette'
import { PaneContainer } from '@/components/panes'
import { usePanes } from '@/context/PanesProvider'

import { Header } from './header'
import { StatusBar } from './status-bar'

type SessionGraphPaletteActions = {
  onNewSession: () => void
  onJumpToLatest: () => void
  onClearSelection: () => void
  selectedSessionKey: string | null
}

export function AppShell() {
  const panes$ = usePanes()
  const panes = use$(() => panes$.panes.get())
  const totalWidth = use$(() => panes$.getTotalPaneWidthPercentage())
  const [isWorkspaceMaximized, setIsWorkspaceMaximized] = useState(false)
  const [paletteActions, setPaletteActions] = useState<SessionGraphPaletteActions | null>(null)

  const handlePaletteActionsChange = useCallback((actions: SessionGraphPaletteActions | null) => {
    setPaletteActions(actions)
  }, [])

  const handleNewSession = useCallback(() => {
    paletteActions?.onNewSession()
  }, [paletteActions])

  const hasPanes = panes.length > 0
  const workspaceWidth = hasPanes ? (isWorkspaceMaximized ? 100 : totalWidth) : 0
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
        <div className="min-h-0 min-w-0 flex-1">
          <div className="h-full w-full border-r border-border/40">
            <SessionGraph onPaletteActionsChange={handlePaletteActionsChange} />
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
      </main>

      <CommandPalette
        onNewSession={handleNewSession}
        onJumpToLatest={paletteActions?.onJumpToLatest}
        onClearSelection={paletteActions?.onClearSelection}
        selectedSessionKey={paletteActions?.selectedSessionKey}
      />

      <StatusBar />
    </div>
  )
}
