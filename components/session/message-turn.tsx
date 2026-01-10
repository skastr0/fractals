'use client'

import { Bot, GitFork, User } from 'lucide-react'
import { type KeyboardEvent, memo, useCallback, useMemo } from 'react'

import { useAgentColors } from '@/context/AgentColorProvider'
import { hexToHsl } from '@/lib/graph/depth-styles'
import type { AssistantMessage, Part, UserMessage } from '@/lib/opencode'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/date'

import { ForkControls } from './fork-controls'
import { PartRenderer } from './part-renderer'

// Pre-computed turn data to avoid O(n²) filtering in MessageTurn
export interface TurnData {
  userMessage: UserMessage
  userParts: Part[]
  assistantMessages: AssistantMessage[]
  assistantParts: Part[]
}

interface MessageTurnProps {
  sessionKey: string
  turnData: TurnData
  isActive?: boolean
  forkCount?: number
  onSelect?: () => void
}

export const MessageTurn = memo(
  function MessageTurn({
    sessionKey,
    turnData,
    isActive,
    forkCount = 0,
    onSelect,
  }: MessageTurnProps) {
    const { userMessage, userParts, assistantMessages, assistantParts } = turnData
    const { getAgentColor } = useAgentColors()

    // Get agent color for visual accent
    const agentColor = getAgentColor(userMessage.agent)

    // Get the last assistant message for metadata display
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]

    // Aggregate token counts from all assistant messages
    const aggregateTokens = useMemo(() => {
      const totals = {
        input: 0,
        output: 0,
        reasoning: 0,
        cache: { read: 0, write: 0 },
        cost: 0,
      }
      for (const msg of assistantMessages) {
        totals.input += msg.tokens.input
        totals.output += msg.tokens.output
        totals.reasoning += msg.tokens.reasoning
        totals.cache.read += msg.tokens.cache.read
        totals.cache.write += msg.tokens.cache.write
        totals.cost += msg.cost
      }
      return totals
    }, [assistantMessages])

    const assistantErrorMessage = useMemo(() => {
      // Check all assistant messages for errors
      for (const msg of assistantMessages) {
        if (msg.error) {
          const error = msg.error
          if (typeof error === 'object' && error && 'data' in error) {
            const data = error.data as { message?: string }
            if (data?.message) {
              return data.message
            }
          }
          return error.name ?? 'Error'
        }
      }
      return null
    }, [assistantMessages])

    const handleSelect = useCallback(() => {
      onSelect?.()
    }, [onSelect])

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (!onSelect) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      },
      [onSelect],
    )

    const interactiveProps = onSelect
      ? { role: 'button' as const, tabIndex: 0, onClick: handleSelect, onKeyDown: handleKeyDown }
      : {}

    return (
      <div
        id={`message-${userMessage.id}`}
        className={cn(
          'flex flex-col gap-3 rounded-lg p-2 transition-colors',
          isActive && 'bg-primary/5 ring-1 ring-primary/30',
        )}
        {...interactiveProps}
      >
        <div className="flex gap-2">
          <div
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
            style={
              agentColor
                ? { backgroundColor: `${hexToHsl(agentColor).replace(')', ' / 0.15)')}` }
                : { backgroundColor: 'hsl(var(--primary) / 0.1)' }
            }
          >
            <User
              className="h-3.5 w-3.5"
              style={
                agentColor ? { color: hexToHsl(agentColor) } : { color: 'hsl(var(--primary))' }
              }
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-sm font-medium text-foreground">You</span>
              <span>{formatRelativeTime(userMessage.time.created)}</span>
              <span
                className="rounded px-1.5 py-0.5 text-xs font-medium"
                style={
                  agentColor
                    ? {
                        backgroundColor: `${hexToHsl(agentColor).replace(')', ' / 0.2)')}`,
                        color: hexToHsl(agentColor),
                      }
                    : undefined
                }
              >
                {userMessage.agent}
              </span>
              <span className="text-xs text-muted-foreground">
                {userMessage.model.providerID}/{userMessage.model.modelID}
              </span>
              {forkCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <GitFork className="h-3 w-3" />
                  {forkCount}
                </span>
              ) : null}
              <span className="ml-auto">
                <ForkControls sessionKey={sessionKey} messageId={userMessage.id} />
              </span>
            </div>
            <div className="space-y-2">
              {userParts.map((part) => (
                <PartRenderer key={part.id} part={part} isAssistant={false} />
              ))}
            </div>
          </div>
        </div>

        {assistantMessages.length > 0 ? (
          <div className="flex gap-2">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
              <Bot className="h-3.5 w-3.5 text-secondary-foreground" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-sm font-medium text-foreground">Assistant</span>
                {lastAssistantMessage ? (
                  <>
                    <span>
                      {lastAssistantMessage.providerID}/{lastAssistantMessage.modelID}
                    </span>
                    {lastAssistantMessage.agent ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {lastAssistantMessage.agent}
                      </span>
                    ) : null}
                    {lastAssistantMessage.finish ? (
                      <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-500">
                        {lastAssistantMessage.finish}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
              {/* Render ALL parts from ALL assistant messages */}
              <div className="space-y-2">
                {assistantParts.map((part) => (
                  <PartRenderer key={part.id} part={part} isAssistant={true} />
                ))}
              </div>
              {/* Show aggregated token counts */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted-foreground">
                {lastAssistantMessage ? (
                  <span>{formatRelativeTime(lastAssistantMessage.time.created)}</span>
                ) : null}
                <span>
                  in {aggregateTokens.input.toLocaleString()} / out{' '}
                  {aggregateTokens.output.toLocaleString()}
                </span>
                {aggregateTokens.reasoning > 0 ? (
                  <span>reasoning {aggregateTokens.reasoning.toLocaleString()}</span>
                ) : null}
                {aggregateTokens.cache.read > 0 || aggregateTokens.cache.write > 0 ? (
                  <span className="text-green-500/80">
                    cache r:{aggregateTokens.cache.read.toLocaleString()} w:
                    {aggregateTokens.cache.write.toLocaleString()}
                  </span>
                ) : null}
                {aggregateTokens.cost > 0 ? <span>${aggregateTokens.cost.toFixed(4)}</span> : null}
              </div>
              {assistantErrorMessage ? (
                <div className="rounded-md border border-error/40 bg-error/10 p-2 text-xs text-error">
                  {assistantErrorMessage}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    )
  },
  // Custom comparison function for memo - only re-render when meaningful props change
  (prevProps, nextProps) => {
    // Fast path: reference equality
    if (prevProps === nextProps) return true

    // Compare primitives
    if (
      prevProps.sessionKey !== nextProps.sessionKey ||
      prevProps.isActive !== nextProps.isActive ||
      prevProps.forkCount !== nextProps.forkCount
    ) {
      return false
    }

    // Compare turnData by checking key identifiers
    const prevTurn = prevProps.turnData
    const nextTurn = nextProps.turnData

    // User message identity
    if (prevTurn.userMessage.id !== nextTurn.userMessage.id) return false

    // Parts count (quick check before deep comparison)
    if (
      prevTurn.userParts.length !== nextTurn.userParts.length ||
      prevTurn.assistantParts.length !== nextTurn.assistantParts.length ||
      prevTurn.assistantMessages.length !== nextTurn.assistantMessages.length
    ) {
      return false
    }

    // Check last assistant message for updates (most common change)
    const prevLast = prevTurn.assistantMessages[prevTurn.assistantMessages.length - 1]
    const nextLast = nextTurn.assistantMessages[nextTurn.assistantMessages.length - 1]
    if (prevLast?.id !== nextLast?.id || prevLast?.finish !== nextLast?.finish) {
      return false
    }

    // Check last part for streaming updates
    const prevLastPart = prevTurn.assistantParts[prevTurn.assistantParts.length - 1]
    const nextLastPart = nextTurn.assistantParts[nextTurn.assistantParts.length - 1]
    if (prevLastPart?.id !== nextLastPart?.id) return false

    // If parts are text, check content length (streaming indicator)
    if (
      prevLastPart?.type === 'text' &&
      nextLastPart?.type === 'text' &&
      prevLastPart.text?.length !== nextLastPart.text?.length
    ) {
      return false
    }

    return true
  },
)
