'use client'

import { use$ } from '@legendapp/state/react'
import { Handle, type Node, type NodeProps, Position } from '@xyflow/react'
import { Minus, Plus, Zap } from 'lucide-react'
import { memo } from 'react'
import { tv } from 'tailwind-variants'

import { StatusDot } from '@/components/ui/status-dot'
import { useSync } from '@/context/SyncProvider'
import { getDepthAccentColor } from '@/lib/graph/depth-styles'
import type { SessionStatus as SDKSessionStatus } from '@/lib/opencode'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/date'
import type { SessionNodeData, SessionStatus } from '@/types'

type SessionFlowNode = Node<SessionNodeData, 'session'>

const nodeVariants = tv({
  base: [
    'relative w-[280px] rounded-lg border bg-background/90 px-4 py-3',
    'shadow-sm backdrop-blur-sm transition-all duration-300',
  ],
  variants: {
    selected: {
      true: 'border-primary ring-1 ring-primary/40 shadow-lg shadow-primary/10',
      false: 'border-border hover:border-border/80 hover:bg-background/95',
    },
    highlighted: {
      true: 'border-primary/60 bg-primary/5',
      false: '',
    },
    subagent: {
      true: 'border-l-4 pl-3 bg-secondary/5',
    },
    status: {
      idle: '',
      busy: 'border-green-500 ring-2 ring-green-500/50 shadow-lg shadow-green-500/20',
      retry: 'border-yellow-500 ring-1 ring-yellow-500/30',
      pending_permission: 'border-red-500 ring-1 ring-red-500/30',
    },
    mostRecent: {
      true: [
        'border-cyan-400/80 ring-2 ring-cyan-400/40',
        'shadow-lg shadow-cyan-500/25',
        'bg-gradient-to-br from-background/95 to-cyan-950/10',
      ],
      false: '',
    },
    stale: {
      true: 'opacity-60',
      false: '',
    },
  },
  defaultVariants: {
    selected: false,
    highlighted: false,
    subagent: false,
    status: 'idle',
    mostRecent: false,
    stale: false,
  },
})

const handleClass = '!h-3 !w-3 !rounded-sm !border-0 !bg-border/80'

export const SessionNode = memo(function SessionNode({
  data,
  selected,
}: NodeProps<SessionFlowNode>) {
  // V3: Subscribe to THIS session's status only - granular subscription
  // This prevents the entire graph from re-rendering when any session's status changes
  const { state$ } = useSync()
  const liveStatus = use$(state$.data.sessionStatus[data.sessionKey]) as
    | SDKSessionStatus
    | undefined
  // SDK status is { type: 'idle' | 'busy' | ... }, local status is string
  const status: SessionStatus = liveStatus?.type ?? data.status ?? 'idle'

  const isSelected = data.isSelected || selected
  const isHighlighted = Boolean(data.isHighlighted)
  const isMostRecent = Boolean(data.isMostRecent)
  const isStale = Boolean(data.isStale) && !isMostRecent
  const childCount = data.childCount ?? 0
  const hasChildren = childCount > 0
  const isCollapsed = Boolean(data.isCollapsed)
  const title = data.title?.trim() ? data.title : 'Untitled Session'
  const timeLabel = formatRelativeTime(data.updatedAt)
  const projectLabel = data.projectLabel?.trim()
  const depthAccent = getDepthAccentColor(data.depth)

  return (
    <div
      className={nodeVariants({
        selected: isSelected,
        highlighted: isHighlighted && !isSelected,
        subagent: data.isSubagent,
        status,
        mostRecent: isMostRecent && !isSelected,
        stale: isStale && !isSelected && !isHighlighted,
      })}
      style={data.isSubagent ? { borderLeftColor: depthAccent } : undefined}
    >
      <Handle type="target" position={Position.Left} className={handleClass} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate" title={title}>
            {title}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{timeLabel}</span>
          </div>
          {projectLabel ? (
            <div className="mt-1 truncate text-[11px] text-muted-foreground" title={projectLabel}>
              {projectLabel}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {isMostRecent && (
            <span
              className="flex items-center justify-center rounded bg-cyan-500/20 p-1 text-cyan-400"
              title="Most recently updated session"
            >
              <Zap className="h-3.5 w-3.5" />
            </span>
          )}
          <StatusDot status={status} size="sm" />
        </div>
      </div>
      {hasChildren ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            data.onToggleCollapse?.()
          }}
          aria-label={
            isCollapsed
              ? `Show ${childCount} subagent${childCount === 1 ? '' : 's'}`
              : 'Hide subagents'
          }
          aria-expanded={!isCollapsed}
          className={cn(
            'absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium shadow-sm transition',
            isCollapsed
              ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
              : 'border-border/60 bg-background/90 text-muted-foreground hover:bg-background',
          )}
        >
          {isCollapsed ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          <span>{childCount}</span>
        </button>
      ) : null}
      <Handle type="source" position={Position.Right} className={handleClass} />
    </div>
  )
})
