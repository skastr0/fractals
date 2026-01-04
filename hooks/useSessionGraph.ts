'use client'

import type { Edge, Node } from '@xyflow/react'
import ELK from 'elkjs/lib/elk.bundled.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useSessionFilter } from '@/context/SessionFilterProvider'
import { useSync } from '@/context/SyncProvider'
import { filterSessionsByHours } from '@/lib/graph/session-filter'
import {
  buildSessionTree,
  findPathToSession,
  getDescendants,
  getTreeStats,
  type SessionTreeNode,
  treeToFlowElements,
} from '@/lib/graph/tree-builder'
import type { SessionNodeData, SubagentGroupData } from '@/types'

import { useSessions } from './useSessions'

const NODE_WIDTH = 280
const NODE_HEIGHT = 96

const LAYOUT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '120',
  'elk.spacing.nodeNode': '60',
  'elk.layered.crossingMinimization.semiInteractive': 'true',
} as const

type SessionFlowNode = Node<SessionNodeData, 'session'>

type SubagentGroupNode = Node<SubagentGroupData, 'subagentGroup'>

type ArrowDirection = 'left' | 'right' | 'up' | 'down'

type StatusLike = { type?: string } | string | undefined

const statusPriority = ['idle', 'busy', 'retry', 'pending_permission'] as const

type StatusType = SessionNodeData['status']

const getStatusType = (status: StatusLike): StatusType => {
  const raw = typeof status === 'string' ? status : status?.type
  if (raw && statusPriority.includes(raw as StatusType)) {
    return raw as StatusType
  }
  return 'idle'
}

const collectChildCounts = (tree: SessionTreeNode[]): Map<string, number> => {
  const counts = new Map<string, number>()

  const traverse = (node: SessionTreeNode) => {
    counts.set(node.data.id, node.children.length)
    for (const child of node.children) {
      traverse(child)
    }
  }

  for (const root of tree) {
    traverse(root)
  }

  return counts
}

const filterCollapsedTree = (
  tree: SessionTreeNode[],
  collapsedIds: Set<string>,
): SessionTreeNode[] => {
  return tree.map((node) => {
    if (collapsedIds.has(node.data.id)) {
      return { data: node.data, depth: node.depth, children: [] }
    }

    return {
      data: node.data,
      depth: node.depth,
      children: filterCollapsedTree(node.children, collapsedIds),
    }
  })
}

const GROUP_PADDING = 24

const buildGroupNodes = (
  tree: SessionTreeNode[],
  positions: Map<string, { x: number; y: number }>,
): SubagentGroupNode[] => {
  const groups: SubagentGroupNode[] = []

  const walk = (
    node: SessionTreeNode,
  ): { minX: number; minY: number; maxX: number; maxY: number } | null => {
    const position = positions.get(node.data.id)
    if (!position) {
      return null
    }

    let bounds = {
      minX: position.x,
      minY: position.y,
      maxX: position.x + NODE_WIDTH,
      maxY: position.y + NODE_HEIGHT,
    }

    for (const child of node.children) {
      const childBounds = walk(child)
      if (!childBounds) {
        continue
      }

      bounds = {
        minX: Math.min(bounds.minX, childBounds.minX),
        minY: Math.min(bounds.minY, childBounds.minY),
        maxX: Math.max(bounds.maxX, childBounds.maxX),
        maxY: Math.max(bounds.maxY, childBounds.maxY),
      }
    }

    if (node.children.length > 0) {
      const width = bounds.maxX - bounds.minX + GROUP_PADDING * 2
      const height = bounds.maxY - bounds.minY + GROUP_PADDING * 2

      groups.push({
        id: `group-${node.data.id}`,
        type: 'subagentGroup',
        position: { x: bounds.minX - GROUP_PADDING, y: bounds.minY - GROUP_PADDING },
        data: { parentId: node.data.id, depth: node.depth + 1 },
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
        style: { width, height, zIndex: 0 },
      })
    }

    return bounds
  }

  for (const root of tree) {
    walk(root)
  }

  return groups
}

export function useSessionGraph() {
  const { sessions } = useSessions()
  const sync = useSync()
  const { filterHours, setFilterHours } = useSessionFilter()
  const elk = useMemo(() => new ELK(), [])
  const treeIndexRef = useRef<Map<string, SessionTreeNode>>(new Map())
  const [layoutedNodes, setLayoutedNodes] = useState<SessionFlowNode[]>([])
  const [layoutedEdges, setLayoutedEdges] = useState<Edge[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(new Set())
  const [isLayouting, setIsLayouting] = useState(false)

  const nodeCenters = useMemo(() => {
    return new Map(
      layoutedNodes.map((node) => [
        node.id,
        { x: node.position.x + NODE_WIDTH / 2, y: node.position.y + NODE_HEIGHT / 2 },
      ]),
    )
  }, [layoutedNodes])

  const toggleCollapse = useCallback((sessionId: string) => {
    setCollapsedSessions((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }, [])

  const filteredSessions = useMemo(
    () => filterSessionsByHours(sessions, filterHours),
    [filterHours, sessions],
  )

  const _sessionCount = sessions.length
  const _filteredSessionCount = filteredSessions.length

  const treeResult = useMemo(() => {
    const result = buildSessionTree(filteredSessions, {
      previousIndex: treeIndexRef.current,
      reuseNodes: true,
      onCircularReference: (path, sessionId) => {
        console.warn('Circular session reference detected.', { sessionId, path })
      },
    })

    treeIndexRef.current = result.index
    return result
  }, [filteredSessions])

  const tree = treeResult.tree
  const treeStats = useMemo(() => getTreeStats(tree), [tree])
  const childCounts = useMemo(() => collectChildCounts(tree), [tree])

  const highlightedSessions = useMemo(() => {
    if (!selectedSessionId) {
      return new Set<string>()
    }

    const path = findPathToSession(tree, selectedSessionId)
    if (!path) {
      return new Set<string>()
    }

    const ancestors = path.map((node) => node.data.id)
    const descendants = getDescendants(tree, selectedSessionId).map((session) => session.id)

    return new Set([...ancestors, ...descendants])
  }, [selectedSessionId, tree])

  const displayTree = useMemo(
    () => filterCollapsedTree(tree, collapsedSessions),
    [collapsedSessions, tree],
  )

  const baseGraph = useMemo(() => {
    return treeToFlowElements(displayTree, {
      childCounts,
      collapsedIds: collapsedSessions,
      onToggleCollapse: toggleCollapse,
    })
  }, [childCounts, collapsedSessions, displayTree, toggleCollapse])

  const sessionIdSet = useMemo(
    () => new Set(filteredSessions.map((session) => session.id)),
    [filteredSessions],
  )

  useEffect(() => {
    let cancelled = false

    const layoutGraph = async () => {
      if (baseGraph.nodes.length === 0) {
        setLayoutedNodes([])
        setLayoutedEdges([])
        setIsLayouting(false)
        return
      }

      setIsLayouting(true)

      const graph = await elk.layout({
        id: 'root',
        layoutOptions: LAYOUT_OPTIONS,
        children: baseGraph.nodes.map((node) => ({
          id: node.id,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        })),
        edges: baseGraph.edges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      })

      if (cancelled) {
        return
      }

      const positions = new Map(
        (graph.children ?? []).map((child) => [child.id, { x: child.x ?? 0, y: child.y ?? 0 }]),
      )

      setLayoutedNodes(
        baseGraph.nodes.map((node) => ({
          ...node,
          position: positions.get(node.id) ?? node.position,
          style: { width: NODE_WIDTH, height: NODE_HEIGHT },
        })),
      )
      setLayoutedEdges(baseGraph.edges)
      setIsLayouting(false)
    }

    void layoutGraph()

    return () => {
      cancelled = true
    }
  }, [baseGraph.edges, baseGraph.nodes, elk])

  useEffect(() => {
    if (!selectedSessionId) {
      return
    }

    if (!sessionIdSet.has(selectedSessionId)) {
      setSelectedSessionId(null)
    }
  }, [selectedSessionId, sessionIdSet])

  const selectSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId)
  }, [])

  const moveSelection = useCallback(
    (direction: ArrowDirection) => {
      if (layoutedNodes.length === 0) {
        return
      }

      const fallbackId = layoutedNodes[0]?.id
      if (!fallbackId) {
        return
      }

      const currentId = selectedSessionId ?? fallbackId
      const currentCenter = nodeCenters.get(currentId)

      if (!currentCenter) {
        setSelectedSessionId(fallbackId)
        return
      }

      let bestId: string | null = null
      let bestScore = Number.POSITIVE_INFINITY

      for (const node of layoutedNodes) {
        if (node.id === currentId) {
          continue
        }

        const candidateCenter = nodeCenters.get(node.id)
        if (!candidateCenter) {
          continue
        }

        const dx = candidateCenter.x - currentCenter.x
        const dy = candidateCenter.y - currentCenter.y

        if (direction === 'left' && dx >= 0) {
          continue
        }
        if (direction === 'right' && dx <= 0) {
          continue
        }
        if (direction === 'up' && dy >= 0) {
          continue
        }
        if (direction === 'down' && dy <= 0) {
          continue
        }

        const score =
          direction === 'left' || direction === 'right'
            ? Math.abs(dx) + Math.abs(dy) * 2
            : Math.abs(dy) + Math.abs(dx) * 2

        if (score < bestScore) {
          bestScore = score
          bestId = node.id
        }
      }

      if (bestId) {
        setSelectedSessionId(bestId)
      }
    },
    [layoutedNodes, nodeCenters, selectedSessionId],
  )

  const clearSelection = useCallback(() => {
    setSelectedSessionId(null)
  }, [])

  const statusMap = sync.data.sessionStatus

  const groupNodes = useMemo(() => {
    if (layoutedNodes.length === 0) {
      return []
    }

    const positions = new Map(layoutedNodes.map((node) => [node.id, node.position]))
    return buildGroupNodes(displayTree, positions)
  }, [displayTree, layoutedNodes])

  const nodes = useMemo<Array<Node<SessionNodeData | SubagentGroupData>>>(() => {
    const sessionNodes = layoutedNodes.map((node) => {
      const status = getStatusType(statusMap[node.id])
      const isSelected = node.id === selectedSessionId

      return {
        ...node,
        data: {
          ...node.data,
          status,
          isSelected,
          isHighlighted: highlightedSessions.has(node.id),
        },
      }
    })

    return [...groupNodes, ...sessionNodes]
  }, [groupNodes, highlightedSessions, layoutedNodes, selectedSessionId, statusMap])

  const edges = useMemo(() => {
    return layoutedEdges.map((edge) => {
      const status = getStatusType(statusMap[edge.target])
      const isHighlighted =
        highlightedSessions.has(edge.source) && highlightedSessions.has(edge.target)

      return {
        ...edge,
        animated: status === 'busy',
        style: {
          stroke: isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--border))',
          strokeWidth: isHighlighted ? 2 : 1,
        },
      }
    })
  }, [highlightedSessions, layoutedEdges, statusMap])

  return {
    nodes,
    edges,
    stats: treeStats,
    sessionCount: _sessionCount,
    filteredSessionCount: _filteredSessionCount,
    filterHours,
    setFilterHours,
    selectedSessionId,
    selectSession,
    moveSelection,
    clearSelection,
    isLayouting,
  }
}
