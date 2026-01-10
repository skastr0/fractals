'use client'

import type { Node } from '@xyflow/react'
import { Background, PanOnScrollMode, ReactFlow, useReactFlow } from '@xyflow/react'
import { Zap } from 'lucide-react'
import type { MouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import '@xyflow/react/dist/style.css'

import {
  SessionPane,
  SessionPaneHeaderActions,
  SessionPaneHeaderContent,
} from '@/components/panes/session-pane'
import { Button } from '@/components/ui/button'
import { useFocusManager } from '@/context/FocusManagerProvider'
import { useOpenCode } from '@/context/OpenCodeProvider'
import { usePanes } from '@/context/PanesProvider'
import { getActiveProject, useProject } from '@/context/ProjectProvider'
import { usePreloadPreviews } from '@/hooks/usePreloadPreviews'
import { useSessionGraph } from '@/hooks/useSessionGraph'
import { buildSessionKey } from '@/lib/utils/session-key'
import type { SessionNodeData, SubagentGroupData } from '@/types'

import { SessionNode } from './session-node'
import { SubagentGroup } from './subagent-group'

const nodeTypes = {
  session: SessionNode,
  subagentGroup: SubagentGroup,
}

export interface SessionGraphPaletteActions {
  onNewSession: () => void
  onJumpToLatest: () => void
  onClearSelection: () => void
  selectedSessionKey: string | null
}

interface SessionGraphProps {
  onPaletteActionsChange?: (actions: SessionGraphPaletteActions | null) => void
}

export function SessionGraph({ onPaletteActionsChange }: SessionGraphProps) {
  const {
    nodes,
    edges,
    selectSession,
    moveSelection,
    clearSelection,
    mostRecentSessionId,
    selectedSessionId,
  } = useSessionGraph()
  const { client } = useOpenCode()
  const { currentProject, projects, selectedProjectIds } = useProject()
  const panes$ = usePanes()
  const { isGraphFocused } = useFocusManager()
  const { setCenter, getZoom } = useReactFlow()

  const activeProject = getActiveProject({ currentProject, projects, selectedProjectIds })

  // Extract session keys from nodes for preview preloading
  const sessionKeys = useMemo(
    () =>
      nodes.filter((n) => n.type === 'session').map((n) => (n.data as SessionNodeData).sessionKey),
    [nodes],
  )

  // Preload previews for visible sessions in the background
  usePreloadPreviews({ sessionKeys })

  const handleQuickNewSession = useCallback(async () => {
    if (!client || !activeProject) {
      return
    }

    try {
      const result = await client.session.create(
        { directory: activeProject.worktree },
        { throwOnError: true },
      )

      const newSession = result.data
      if (newSession?.id) {
        const sessionKey = buildSessionKey(activeProject.worktree, newSession.id)
        const paneContent = <SessionPane sessionKey={sessionKey} autoFocus />
        const headerContent = <SessionPaneHeaderContent sessionKey={sessionKey} />
        const headerActions = <SessionPaneHeaderActions sessionKey={sessionKey} />
        const hasSessionPane = panes$.panes.get().some((pane) => pane.id === 'session')

        if (hasSessionPane) {
          panes$.stackPane('session', paneContent)
          panes$.setPaneTitle('session', 'New Session')
        } else {
          panes$.openPane({
            type: 'session',
            component: paneContent,
            title: 'New Session',
            headerContent,
            headerActions,
          })
        }
      }
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }, [activeProject, client, panes$])

  // Find the most recent node's position for focusing
  const mostRecentNode = useMemo(() => {
    if (!mostRecentSessionId) {
      return null
    }
    return nodes.find(
      (node) =>
        node.type === 'session' &&
        (node.data as SessionNodeData).sessionKey === mostRecentSessionId,
    )
  }, [mostRecentSessionId, nodes])

  const focusMostRecent = useCallback(() => {
    if (!mostRecentNode) {
      return
    }

    const nodeWidth = 280
    const nodeHeight = 120
    const x = mostRecentNode.position.x + nodeWidth / 2
    const y = mostRecentNode.position.y + nodeHeight / 2
    const zoom = Math.max(getZoom(), 1)

    setCenter(x, y, { zoom, duration: 400 })
    selectSession(mostRecentSessionId!)
  }, [mostRecentNode, mostRecentSessionId, getZoom, setCenter, selectSession])

  const handleNodeClick = useCallback(
    (_event: MouseEvent, node: Node<SessionNodeData | SubagentGroupData>) => {
      if (node.type !== 'session') {
        return
      }

      const data = node.data as SessionNodeData
      const sessionKey = data.sessionKey
      const title = data.title?.trim() || 'Session'

      selectSession(sessionKey)

      const paneContent = <SessionPane sessionKey={sessionKey} />
      const headerContent = <SessionPaneHeaderContent sessionKey={sessionKey} />
      const headerActions = <SessionPaneHeaderActions sessionKey={sessionKey} />
      const hasSessionPane = panes$.panes.get().some((pane) => pane.id === 'session')

      if (hasSessionPane) {
        panes$.stackPane('session', paneContent)
        panes$.setPaneTitle('session', title)
      } else {
        panes$.openPane({
          type: 'session',
          component: paneContent,
          title,
          headerContent,
          headerActions,
        })
      }
    },
    [panes$, selectSession],
  )

  const handlePaneClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  // Use refs to hold the latest callback values to avoid effect dependency cycles
  const actionsRef = useRef({
    onNewSession: handleQuickNewSession,
    onJumpToLatest: focusMostRecent,
    onClearSelection: clearSelection,
  })

  // Keep refs updated with latest callbacks
  actionsRef.current = {
    onNewSession: handleQuickNewSession,
    onJumpToLatest: focusMostRecent,
    onClearSelection: clearSelection,
  }

  useEffect(() => {
    if (!onPaletteActionsChange) {
      return
    }

    // Create stable wrapper functions that delegate to refs
    const actions: SessionGraphPaletteActions = {
      onNewSession: () => actionsRef.current.onNewSession(),
      onJumpToLatest: () => actionsRef.current.onJumpToLatest(),
      onClearSelection: () => actionsRef.current.onClearSelection(),
      selectedSessionKey: selectedSessionId,
    }

    onPaletteActionsChange(actions)

    return () => {
      onPaletteActionsChange(null)
    }
  }, [onPaletteActionsChange, selectedSessionId])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isGraphFocused()) {
        return
      }

      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          clearSelection()
          return
        case 'ArrowUp':
          event.preventDefault()
          moveSelection('up')
          return
        case 'ArrowDown':
          event.preventDefault()
          moveSelection('down')
          return
        case 'ArrowLeft':
          event.preventDefault()
          moveSelection('left')
          return
        case 'ArrowRight':
          event.preventDefault()
          moveSelection('right')
          return
        default:
          return
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [clearSelection, isGraphFocused, moveSelection])

  return (
    <div className="relative h-full w-full bg-background" data-focus-area="graph">
      <ReactFlow<Node<SessionNodeData | SubagentGroupData>>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        elementsSelectable
        selectNodesOnDrag={false}
        panOnDrag
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        panOnScrollSpeed={0.8}
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--border))" gap={20} size={1} />
      </ReactFlow>

      {/* Jump to most recent session button */}
      {mostRecentNode && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            variant="outline"
            size="sm"
            onPress={focusMostRecent}
            className="gap-1.5 border-cyan-500/50 bg-background/95 text-cyan-400 shadow-lg backdrop-blur-sm hover:border-cyan-400 hover:bg-cyan-950/20"
            aria-label="Jump to most recent session"
          >
            <Zap className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Latest</span>
          </Button>
        </div>
      )}
    </div>
  )
}
