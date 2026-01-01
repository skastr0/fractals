'use client'

import { Handle, type Node, type NodeProps, Position } from '@xyflow/react'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'
import { memo } from 'react'
import { tv } from 'tailwind-variants'

import { StatusDot } from '@/components/ui/status-dot'
import { getDepthAccentColor } from '@/lib/graph/depth-styles'
import { formatRelativeTime } from '@/lib/utils/date'
import type { SessionNodeData } from '@/types'

type SessionFlowNode = Node<SessionNodeData, 'session'>

const nodeVariants = tv({
  base: [
    'relative w-[280px] rounded-lg border bg-background/90 px-4 py-3',
    'shadow-sm backdrop-blur-sm transition-colors',
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
      busy: 'border-primary/60',
      retry: 'border-warning/60',
      pending_permission: 'border-error/60',
    },
  },
  defaultVariants: {
    selected: false,
    highlighted: false,
    subagent: false,
    status: 'idle',
  },
})

const handleClass = '!h-3 !w-3 !rounded-sm !border-0 !bg-border/80'

export const SessionNode = memo(function SessionNode({
  data,
  selected,
}: NodeProps<SessionFlowNode>) {
  const isSelected = data.isSelected || selected
  const isHighlighted = Boolean(data.isHighlighted)
  const hasChildren = (data.childCount ?? 0) > 0
  const isCollapsed = Boolean(data.isCollapsed)
  const title = data.title?.trim() ? data.title : 'Untitled Session'
  const timeLabel = formatRelativeTime(data.updatedAt)
  const depthAccent = getDepthAccentColor(data.depth)

  return (
    <div
      className={nodeVariants({
        selected: isSelected,
        highlighted: isHighlighted && !isSelected,
        subagent: data.isSubagent,
        status: data.status,
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
            {data.isSubagent ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground">
                Subagent depth {data.depth}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <StatusDot status={data.status} size="sm" />
        </div>
      </div>
      {hasChildren ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            data.onToggleCollapse?.()
          }}
          aria-label={isCollapsed ? 'Expand subagents' : 'Collapse subagents'}
          aria-expanded={!isCollapsed}
          className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/60 bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm transition hover:bg-background"
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <Users className="h-3 w-3" />
          <span>{data.childCount}</span>
        </button>
      ) : null}
      <Handle type="source" position={Position.Right} className={handleClass} />
    </div>
  )
})
