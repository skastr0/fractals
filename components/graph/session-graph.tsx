'use client'

import type { Node } from '@xyflow/react'
import { Background, Controls, PanOnScrollMode, ReactFlow, useReactFlow } from '@xyflow/react'
import type { MouseEvent } from 'react'
import { useCallback, useEffect } from 'react'
import '@xyflow/react/dist/style.css'

import { SessionPane } from '@/components/panes/session-pane'
import { useFocusManager } from '@/context/FocusManagerProvider'
import { usePanes } from '@/context/PanesProvider'
import { useSessionGraph } from '@/hooks/useSessionGraph'
import type { SessionNodeData, SubagentGroupData } from '@/types'

import { SessionNode } from './session-node'
import { SubagentGroup } from './subagent-group'

const nodeTypes = {
  session: SessionNode,
  subagentGroup: SubagentGroup,
}

export function SessionGraph() {
  const { nodes, edges, selectSession, moveSelection, clearSelection } = useSessionGraph()
  const panes$ = usePanes()
  const { isGraphFocused } = useFocusManager()
  const { fitView } = useReactFlow()

  const handleNodeClick = useCallback(
    (_event: MouseEvent, node: Node<SessionNodeData | SubagentGroupData>) => {
      if (node.type !== 'session') {
        return
      }

      const data = node.data as SessionNodeData
      const sessionId = data.sessionId
      const title = data.title?.trim() || 'Session'

      selectSession(sessionId)

      const paneContent = <SessionPane sessionId={sessionId} />
      const hasSessionPane = panes$.panes.get().some((pane) => pane.id === 'session')

      if (hasSessionPane) {
        panes$.stackPane('session', paneContent)
        panes$.setPaneTitle('session', title)
      } else {
        panes$.openPane({
          type: 'session',
          component: paneContent,
          title,
        })
      }
    },
    [panes$, selectSession],
  )

  const handlePaneClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

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

  useEffect(() => {
    if (nodes.length === 0) {
      return
    }

    const handle = window.requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 300 })
    })

    return () => window.cancelAnimationFrame(handle)
  }, [fitView, nodes.length])

  return (
    <div className="h-full w-full bg-background" data-focus-area="graph">
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
        <Controls className="!bg-background !border-border" />
      </ReactFlow>
    </div>
  )
}
