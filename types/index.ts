/**
 * Session status from OpenCode
 */
export type SessionStatus = 'idle' | 'busy' | 'retry' | 'pending_permission'

/**
 * Pane types in the UI
 */
export type PaneType = 'session' | 'config' | 'project' | 'agent' | 'metadata' | 'file' | 'diff'

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
  | `diff-${string}`

/**
 * File diff from OpenCode session
 */
export interface FileDiff {
  file: string
  before: string
  after: string
  additions: number
  deletions: number
}

/**
 * Session node data for ReactFlow
 */
export interface SessionNodeData extends Record<string, unknown> {
  sessionKey: string
  title: string
  projectLabel: string
  /** True if this session is in a git worktree (sandbox) */
  isWorktree?: boolean
  /** The worktree name if in a sandbox */
  worktreeName?: string | null
  status: SessionStatus
  depth: number
  isSubagent: boolean
  isSelected: boolean
  isHighlighted?: boolean
  isMostRecent?: boolean
  isStale?: boolean
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

export * from './commands'
