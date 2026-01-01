/**
 * Session status from OpenCode
 */
export type SessionStatus = 'idle' | 'busy' | 'retry' | 'pending_permission'

/**
 * Pane types in the UI
 */
export type PaneType = 'session' | 'config' | 'project' | 'agent' | 'metadata' | 'file'

/**
 * Pane identifier - some are singleton, some can have multiple instances
 */
export type PaneId =
  | 'session'
  | 'config'
  | 'project'
  | 'metadata'
  | `agent-${string}`
  | `file-${string}`

/**
 * Session node data for ReactFlow
 */
export interface SessionNodeData extends Record<string, unknown> {
  sessionId: string
  title: string
  status: SessionStatus
  depth: number
  isSubagent: boolean
  isSelected: boolean
  isHighlighted?: boolean
  updatedAt: number
  childCount?: number
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export interface SubagentGroupData extends Record<string, unknown> {
  parentId: string
  depth: number
}

/**
 * Tree node for building session hierarchy
 */
export interface TreeNode<T> {
  data: T
  children: TreeNode<T>[]
  depth: number
}
