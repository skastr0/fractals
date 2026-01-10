'use client'

import { use$ } from '@legendapp/state/react'
import { Handle, type Node, type NodeProps, Position } from '@xyflow/react'
import { Coins, Gauge, Minus, Plus, Zap } from 'lucide-react'
import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import { StatusDot } from '@/components/ui/status-dot'
import { useAgentColors } from '@/context/AgentColorProvider'
import { useSync } from '@/context/SyncProvider'
import { getAccentColor } from '@/lib/graph/depth-styles'
import type {
  AssistantMessage,
  Message,
  Part,
  SessionStatus as SDKSessionStatus,
  UserMessage,
} from '@/lib/opencode'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/date'
import type { SessionNodeData, SessionStatus } from '@/types'

// Default context limit for common models when we can't look it up
const DEFAULT_CONTEXT_LIMIT = 200_000

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0'
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

function isAssistantMessage(message: Message): message is AssistantMessage {
  return message.role === 'assistant'
}

function isUserMessage(message: Message): message is UserMessage {
  return message.role === 'user'
}

/**
 * Get the agent name from session messages.
 * Returns the most recent user message's agent field.
 */
function getAgentName(messages: Message[] | undefined): string | undefined {
  if (!messages || messages.length === 0) {
    return undefined
  }
  // Find the most recent user message with an agent field
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg && isUserMessage(msg) && msg.agent) {
      return msg.agent
    }
  }
  return undefined
}

interface TokenStats {
  output: number
  cost: number
  contextPercent: number | null
}

function computeTokenStats(messages: Message[] | undefined): TokenStats {
  if (!messages || messages.length === 0) {
    return { output: 0, cost: 0, contextPercent: null }
  }

  const assistantMessages = messages.filter(isAssistantMessage)
  if (assistantMessages.length === 0) {
    return { output: 0, cost: 0, contextPercent: null }
  }

  // Get current context from latest assistant message
  const latestAssistant = assistantMessages[assistantMessages.length - 1]
  const currentContext = latestAssistant?.tokens?.input ?? 0

  // Aggregate output tokens and cost
  let totalOutput = 0
  let totalCost = 0
  for (const msg of assistantMessages) {
    totalOutput += msg.tokens?.output ?? 0
    totalCost += msg.cost ?? 0
  }

  // Calculate context percentage (using default limit)
  // Show 0% if we have output but no context input (rather than hiding)
  const contextPercent =
    currentContext > 0
      ? Math.min(100, (currentContext / DEFAULT_CONTEXT_LIMIT) * 100)
      : totalOutput > 0
        ? 0
        : null

  return { output: totalOutput, cost: totalCost, contextPercent }
}

function getPreviewText(
  messages: Message[] | undefined,
  parts: Part[] | undefined,
  status: SessionStatus,
): string {
  if (!messages || messages.length === 0) {
    return 'No messages yet'
  }
  if (status === 'busy') {
    return 'Waiting for response...'
  }
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage) {
    return 'No messages yet'
  }

  // Try to extract text from parts first (most accurate)
  if (parts && parts.length > 0) {
    // Find the last text part that has meaningful content
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i]
      if (part?.type === 'text') {
        const text = (part as { text?: string }).text?.trim()
        if (text && text.length > 0) {
          // Clean up the text: remove markdown formatting, collapse whitespace
          const cleaned = text
            .replace(/^#+\s*/gm, '') // Remove heading markers
            .replace(/\*\*/g, '') // Remove bold markers
            .replace(/\n+/g, ' ') // Collapse newlines
            .replace(/\s+/g, ' ') // Collapse whitespace
            .trim()
          if (cleaned.length > 0) {
            return cleaned.slice(0, 120)
          }
        }
      }
    }
  }

  // Try to extract text from summary
  const summary = lastMessage.summary
  if (summary && typeof summary === 'object') {
    if (summary.body) {
      return summary.body.slice(0, 120)
    }
    if (summary.title) {
      return summary.title.slice(0, 120)
    }
  }

  return lastMessage.role === 'user' ? 'User message' : 'Assistant response'
}

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
      false: 'border-t-2', // Root nodes get a top accent stripe
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
  // V3: Subscribe to THIS session's status and messages only - granular subscription
  // This prevents the entire graph from re-rendering when any session's status changes
  const { state$ } = useSync()
  const { getAgentColor } = useAgentColors()
  const liveStatus = use$(state$.data.sessionStatus[data.sessionKey]) as
    | SDKSessionStatus
    | undefined
  const messages = use$(state$.data.messages[data.sessionKey]) as Message[] | undefined
  // Get the last message ID to subscribe to its parts
  const lastMessageId = messages?.[messages.length - 1]?.id
  const lastMessageParts = use$(lastMessageId ? state$.data.parts[lastMessageId] : undefined) as
    | Part[]
    | undefined
  // SDK status is { type: 'idle' | 'busy' | ... }, local status is string
  const status: SessionStatus = liveStatus?.type ?? data.status ?? 'idle'
  const preview = useMemo(
    () => getPreviewText(messages, lastMessageParts, status),
    [messages, lastMessageParts, status],
  )
  const tokenStats = useMemo(() => computeTokenStats(messages), [messages])

  // Get agent name from messages to determine color
  const agentName = useMemo(() => getAgentName(messages), [messages])
  const agentColor = agentName ? getAgentColor(agentName) : undefined

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
  // Use agent color if available, otherwise fall back to depth-based color
  const accentColor = getAccentColor(agentColor, data.depth)

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
      style={data.isSubagent ? { borderLeftColor: accentColor } : { borderTopColor: accentColor }}
    >
      <Handle type="target" position={Position.Left} className={handleClass} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate" title={title}>
            {title}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{timeLabel}</span>
            {/* Token stats inline */}
            {tokenStats.contextPercent !== null && (
              <span
                className="flex items-center gap-0.5"
                title={`Context window: ${tokenStats.contextPercent.toFixed(0)}%`}
              >
                <Gauge className="h-2.5 w-2.5" />
                <span className="tabular-nums">{tokenStats.contextPercent.toFixed(0)}%</span>
              </span>
            )}
            {tokenStats.output > 0 && (
              <span
                className="flex items-center gap-0.5"
                title={`Output: ${tokenStats.output.toLocaleString()} tokens`}
              >
                <Zap className="h-2.5 w-2.5" />
                <span className="tabular-nums">{formatNumber(tokenStats.output)}</span>
              </span>
            )}
            {tokenStats.cost > 0 && (
              <span
                className="flex items-center gap-0.5"
                title={`Cost: ${formatCost(tokenStats.cost)}`}
              >
                <Coins className="h-2.5 w-2.5" />
                <span className="tabular-nums">{formatCost(tokenStats.cost)}</span>
              </span>
            )}
          </div>
          {projectLabel ? (
            <div className="mt-1 truncate text-[11px] text-muted-foreground" title={projectLabel}>
              {projectLabel}
            </div>
          ) : null}
          <div className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground/80" title={preview}>
            {preview}
          </div>
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
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  )
})
