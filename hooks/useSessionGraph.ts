'use client'

import type { Edge, Node } from '@xyflow/react'
import ELK from 'elkjs/lib/elk.bundled.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useProject } from '@/context/ProjectProvider'
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
import type { Session } from '@/lib/opencode'
import { formatProjectLabel, parseSessionKey } from '@/lib/utils'
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

type SessionWithKey = Session & {
  sessionKey: string
}

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

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24 hours

export function useSessionGraph() {
  const { sessions: rawSessions } = useSessions()
  const sessions = rawSessions as SessionWithKey[]
  const { state$ } = useSync()
  const { projects } = useProject()
  const { filterHours, setFilterHours } = useSessionFilter()
  const elk = useMemo(() => new ELK(), [])
  const treeIndexRef = useRef<Map<string, SessionTreeNode>>(new Map())
  const [layoutedNodes, setLayoutedNodes] = useState<SessionFlowNode[]>([])
  const [layoutedEdges, setLayoutedEdges] = useState<Edge[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(new Set())
  const [isLayouting, setIsLayouting] = useState(false)

  // Track sessions the user has manually expanded (survives re-renders)
  const userExpandedSessions = useRef<Set<string>>(new Set())

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
        // Expanding: track that user wants this expanded
        next.delete(sessionId)
        userExpandedSessions.current.add(sessionId)
      } else {
        // Collapsing: user no longer wants this expanded
        next.add(sessionId)
        userExpandedSessions.current.delete(sessionId)
      }
      return next
    })
  }, [])

  const filteredSessions = useMemo(
    () => filterSessionsByHours(sessions, filterHours) as SessionWithKey[],
    [filterHours, sessions],
  )

  const sessionKeyById = useMemo(() => {
    return new Map(sessions.map((session) => [session.id, session.sessionKey]))
  }, [sessions])

  const directoryBySessionKey = useMemo(() => {
    const map = new Map<string, string>()
    for (const session of sessions) {
      const parsed = parseSessionKey(session.sessionKey)
      const directory = parsed?.directory ?? session.directory
      if (directory) {
        map.set(session.sessionKey, directory)
      }
    }
    return map
  }, [sessions])

  const projectByDirectory = useMemo(() => {
    return new Map(projects.map((project) => [project.worktree, project]))
  }, [projects])

  const resolveProjectLabel = useCallback(
    (sessionKey: string) => {
      const directory =
        directoryBySessionKey.get(sessionKey) ?? parseSessionKey(sessionKey)?.directory
      const project = directory ? projectByDirectory.get(directory) : undefined
      return formatProjectLabel(project, directory).label
    },
    [directoryBySessionKey, projectByDirectory],
  )

  const graphSessions = useMemo(() => {
    return filteredSessions.map((session) => {
      const parentKey = session.parentID ? sessionKeyById.get(session.parentID) : undefined

      return {
        ...session,
        id: session.sessionKey,
        parentID: parentKey,
      }
    })
  }, [filteredSessions, sessionKeyById])

  const _sessionCount = sessions.length
  const _filteredSessionCount = filteredSessions.length

  // Find the most recent session by updatedAt timestamp and reference time for staleness
  const { mostRecentSessionId, referenceTime } = useMemo(() => {
    const now = Date.now()

    if (filteredSessions.length === 0) {
      return { mostRecentSessionId: null, referenceTime: now }
    }

    let mostRecent = filteredSessions[0]
    for (const session of filteredSessions) {
      const sessionUpdated = session.time?.updated ?? session.time?.created ?? 0
      const mostRecentUpdated = mostRecent?.time?.updated ?? mostRecent?.time?.created ?? 0
      if (sessionUpdated > mostRecentUpdated) {
        mostRecent = session
      }
    }

    return { mostRecentSessionId: mostRecent?.sessionKey ?? null, referenceTime: now }
  }, [filteredSessions])

  const treeResult = useMemo(() => {
    const result = buildSessionTree(graphSessions, {
      previousIndex: treeIndexRef.current,
      reuseNodes: true,
      onCircularReference: (path, sessionId) => {
        console.warn('Circular session reference detected.', { sessionId, path })
      },
    })

    treeIndexRef.current = result.index
    return result
  }, [graphSessions])

  const tree = treeResult.tree
  const treeStats = useMemo(() => getTreeStats(tree), [tree])
  const childCounts = useMemo(() => collectChildCounts(tree), [tree])

  // Auto-collapse sessions with children by default (preserves user expansions)
  useEffect(() => {
    setCollapsedSessions((prev) => {
      let changed = false
      const next = new Set(prev)

      for (const [sessionId, count] of childCounts) {
        // Has children AND user hasn't explicitly expanded it AND not already collapsed
        if (count > 0 && !userExpandedSessions.current.has(sessionId) && !next.has(sessionId)) {
          next.add(sessionId)
          changed = true
        }
      }

      // Return same reference if nothing changed to avoid re-renders
      return changed ? next : prev
    })
  }, [childCounts])

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
    () => new Set(graphSessions.map((session) => session.id)),
    [graphSessions],
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

  // NOTE: Status is now handled at the SessionNode level for granular subscriptions
  // Each SessionNode subscribes to its own status, reducing re-renders significantly
  // For edges, we use peek() to get status without subscribing (edge animation is non-critical)

  const groupNodes = useMemo(() => {
    if (layoutedNodes.length === 0) {
      return []
    }

    const positions = new Map(layoutedNodes.map((node) => [node.id, node.position]))
    return buildGroupNodes(displayTree, positions)
  }, [displayTree, layoutedNodes])

  const nodes = useMemo<Array<Node<SessionNodeData | SubagentGroupData>>>(() => {
    const sessionNodes = layoutedNodes.map((node) => {
      // Status is now fetched at the SessionNode level for granular subscriptions
      // We pass 'idle' as default; the node will subscribe to its own live status
      const isSelected = node.id === selectedSessionId
      const isMostRecent = node.id === mostRecentSessionId
      const age = referenceTime - node.data.updatedAt
      const isStale = age > STALE_THRESHOLD_MS
      const projectLabel = resolveProjectLabel(node.data.sessionKey)

      return {
        ...node,
        data: {
          ...node.data,
          status: 'idle' as const, // Default; SessionNode subscribes to live status
          isSelected,
          isHighlighted: highlightedSessions.has(node.id),
          isMostRecent,
          isStale,
          projectLabel,
        },
      }
    })

    return [...groupNodes, ...sessionNodes]
  }, [
    groupNodes,
    highlightedSessions,
    layoutedNodes,
    mostRecentSessionId,
    referenceTime,
    resolveProjectLabel,
    selectedSessionId,
  ])

  const edges = useMemo(() => {
    // Use peek() for status lookup - edge animation isn't critical for reactivity
    const statusSnapshot = state$.data.sessionStatus.peek() ?? {}

    return layoutedEdges.map((edge) => {
      const status = getStatusType(statusSnapshot[edge.target])
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
  }, [highlightedSessions, layoutedEdges, state$])

  return {
    nodes,
    edges,
    stats: treeStats,
    sessionCount: _sessionCount,
    filteredSessionCount: _filteredSessionCount,
    filterHours,
    setFilterHours,
    selectedSessionId,
    mostRecentSessionId,
    selectSession,
    moveSelection,
    clearSelection,
    isLayouting,
  }
}
