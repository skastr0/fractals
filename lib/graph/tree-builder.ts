import type { Edge, Node } from '@xyflow/react'

import type { Session } from '@/lib/opencode'
import type { SessionNodeData, TreeNode } from '@/types'

export type SessionTreeNode = TreeNode<Session>

export interface TreeStats {
  totalNodes: number
  maxDepth: number
  nodesByDepth: Record<number, number>
  rootCount: number
  subagentCount: number
}

export interface BuildSessionTreeOptions {
  minDepth?: number
  maxDepth?: number
  previousIndex?: Map<string, SessionTreeNode>
  reuseNodes?: boolean
  onCircularReference?: (path: string[], sessionId: string) => void
}

export interface BuildSessionTreeResult {
  tree: SessionTreeNode[]
  index: Map<string, SessionTreeNode>
}

const ROOT_KEY = '__root__'

const getUpdatedAt = (session: Session): number => {
  return session.time?.updated ?? session.time?.created ?? 0
}

const resolveDepth = (session: Session, parentDepth: number): number => {
  const depth = (session as Session & { depth?: number }).depth
  if (typeof depth === 'number') {
    return depth
  }

  return parentDepth + 1
}

const isWithinDepth = (depth: number, minDepth?: number, maxDepth?: number): boolean => {
  if (typeof minDepth === 'number' && depth < minDepth) {
    return false
  }

  if (typeof maxDepth === 'number' && depth > maxDepth) {
    return false
  }

  return true
}

const filterTreeByDepth = (
  tree: SessionTreeNode[],
  minDepth?: number,
  maxDepth?: number,
): SessionTreeNode[] => {
  if (typeof minDepth !== 'number' && typeof maxDepth !== 'number') {
    return tree
  }

  const next: SessionTreeNode[] = []

  for (const node of tree) {
    const filteredChildren = filterTreeByDepth(node.children, minDepth, maxDepth)
    const includeNode = isWithinDepth(node.depth, minDepth, maxDepth)

    if (includeNode) {
      next.push({
        data: node.data,
        depth: node.depth,
        children: filteredChildren,
      })
      continue
    }

    if (typeof minDepth === 'number' && node.depth < minDepth) {
      next.push(...filteredChildren)
    }
  }

  return next
}

export function buildSessionTree(
  sessions: Session[],
  options: BuildSessionTreeOptions = {},
): BuildSessionTreeResult {
  const sessionById = new Map(sessions.map((session) => [session.id, session]))
  const childrenMap = new Map<string, Session[]>()

  for (const session of sessions) {
    const parentId =
      session.parentID && sessionById.has(session.parentID) ? session.parentID : ROOT_KEY
    const list = childrenMap.get(parentId)
    if (list) {
      list.push(session)
    } else {
      childrenMap.set(parentId, [session])
    }
  }

  for (const list of childrenMap.values()) {
    list.sort((a, b) => getUpdatedAt(b) - getUpdatedAt(a))
  }

  const index = new Map<string, SessionTreeNode>()
  const reuseNodes = options.reuseNodes ?? true

  const buildNodes = (session: Session, parentDepth: number, path: string[]): SessionTreeNode[] => {
    if (path.includes(session.id)) {
      options.onCircularReference?.(path, session.id)
      return []
    }

    const nextPath = [...path, session.id]
    const depth = resolveDepth(session, parentDepth)
    const childSessions = childrenMap.get(session.id) ?? []

    const childNodes =
      typeof options.maxDepth === 'number' && depth >= options.maxDepth
        ? []
        : childSessions.flatMap((child) => buildNodes(child, depth, nextPath))

    const previousNode = reuseNodes ? options.previousIndex?.get(session.id) : undefined
    const node: SessionTreeNode = previousNode ?? { data: session, children: [], depth }

    node.data = session
    node.depth = depth
    node.children = childNodes
    index.set(session.id, node)

    const includeNode = isWithinDepth(depth, options.minDepth, options.maxDepth)
    if (includeNode) {
      return [node]
    }

    if (typeof options.minDepth === 'number' && depth < options.minDepth) {
      return childNodes
    }

    return []
  }

  const tree: SessionTreeNode[] = []
  const roots = childrenMap.get(ROOT_KEY) ?? []

  for (const root of roots) {
    tree.push(...buildNodes(root, 0, []))
  }

  if (index.size < sessions.length) {
    for (const session of sessions) {
      if (!index.has(session.id)) {
        tree.push(...buildNodes(session, 0, []))
      }
    }
  }

  return {
    tree: filterTreeByDepth(tree, options.minDepth, options.maxDepth),
    index,
  }
}

export interface TreeToFlowOptions {
  childCounts?: Map<string, number>
  collapsedIds?: Set<string>
  onToggleCollapse?: (sessionId: string) => void
}

export function treeToFlowElements(
  tree: SessionTreeNode[],
  options: TreeToFlowOptions = {},
): { nodes: Node<SessionNodeData, 'session'>[]; edges: Edge[] } {
  const nodes: Node<SessionNodeData, 'session'>[] = []
  const edges: Edge[] = []

  const traverse = (node: SessionTreeNode, parentId?: string) => {
    nodes.push({
      id: node.data.id,
      type: 'session',
      position: { x: 0, y: 0 },
      className: 'transition-transform duration-300 ease-out',
      data: {
        sessionKey: node.data.id,
        title: node.data.title ?? '',
        projectLabel: '',
        status: 'idle',

        depth: node.depth,
        isSubagent: Boolean(node.data.parentID) || node.depth > 0,
        isSelected: false,
        updatedAt: node.data.time?.updated ?? node.data.time?.created ?? 0,
        childCount: options.childCounts?.get(node.data.id) ?? 0,
        isCollapsed: options.collapsedIds?.has(node.data.id) ?? false,
        onToggleCollapse: options.onToggleCollapse
          ? () => options.onToggleCollapse?.(node.data.id)
          : undefined,
      },
    })

    if (parentId) {
      edges.push({
        id: `${parentId}-${node.data.id}`,
        source: parentId,
        target: node.data.id,
        type: 'smoothstep',
      })
    }

    for (const child of node.children) {
      traverse(child, node.data.id)
    }
  }

  for (const root of tree) {
    traverse(root)
  }

  return { nodes, edges }
}

export function getTreeStats(tree: SessionTreeNode[]): TreeStats {
  const stats: TreeStats = {
    totalNodes: 0,
    maxDepth: 0,
    nodesByDepth: {},
    rootCount: tree.length,
    subagentCount: 0,
  }

  const traverse = (node: SessionTreeNode) => {
    stats.totalNodes += 1
    stats.maxDepth = Math.max(stats.maxDepth, node.depth)
    stats.nodesByDepth[node.depth] = (stats.nodesByDepth[node.depth] ?? 0) + 1

    if (node.depth > 0) {
      stats.subagentCount += 1
    }

    for (const child of node.children) {
      traverse(child)
    }
  }

  for (const root of tree) {
    traverse(root)
  }

  return stats
}

export function findPathToSession(
  tree: SessionTreeNode[],
  targetId: string,
): SessionTreeNode[] | null {
  const traverse = (node: SessionTreeNode, path: SessionTreeNode[]): SessionTreeNode[] | null => {
    const nextPath = [...path, node]

    if (node.data.id === targetId) {
      return nextPath
    }

    for (const child of node.children) {
      const result = traverse(child, nextPath)
      if (result) {
        return result
      }
    }

    return null
  }

  for (const root of tree) {
    const result = traverse(root, [])
    if (result) {
      return result
    }
  }

  return null
}

export function getDescendants(tree: SessionTreeNode[], sessionId: string): Session[] {
  const descendants: Session[] = []

  const collect = (node: SessionTreeNode) => {
    for (const child of node.children) {
      descendants.push(child.data)
      collect(child)
    }
  }

  const findAndCollect = (nodes: SessionTreeNode[]): boolean => {
    for (const node of nodes) {
      if (node.data.id === sessionId) {
        collect(node)
        return true
      }

      if (findAndCollect(node.children)) {
        return true
      }
    }

    return false
  }

  findAndCollect(tree)
  return descendants
}
