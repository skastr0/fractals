'use client'

import { Bot, GitFork, User } from 'lucide-react'
import { type KeyboardEvent, memo, useCallback, useMemo } from 'react'

import { useSession } from '@/hooks/useSession'
import type { AssistantMessage, Part, UserMessage } from '@/lib/opencode'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/date'

import { ForkControls } from './fork-controls'
import { PartRenderer } from './part-renderer'

interface MessageTurnProps {
  sessionId: string
  userMessage: UserMessage
  isActive?: boolean
  forkCount?: number
  onSelect?: () => void
}

export const MessageTurn = memo(function MessageTurn({
  sessionId,
  userMessage,
  isActive,
  forkCount = 0,
  onSelect,
}: MessageTurnProps) {
  const { messages, getParts } = useSession(sessionId)

  // Get ALL assistant messages for this user message (not just the first one!)
  // Each LLM step/continuation creates a new assistant message
  const assistantMessages = useMemo(() => {
    return messages
      .filter(
        (message): message is AssistantMessage =>
          message.role === 'assistant' && message.parentID === userMessage.id,
      )
      .sort((a, b) => a.id.localeCompare(b.id)) // Sort by ID to maintain order
  }, [messages, userMessage.id])

  // Get the last assistant message for metadata display
  const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]

  // Collect ALL parts from ALL assistant messages
  const allAssistantParts = useMemo(() => {
    const parts: Part[] = []
    for (const msg of assistantMessages) {
      const msgParts = getParts(msg.id)
      parts.push(...msgParts)
    }
    return parts
  }, [assistantMessages, getParts])

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

  const userParts = getParts(userMessage.id)

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
        'flex flex-col gap-4 rounded-lg transition-colors',
        isActive ? 'bg-primary/5 p-4 ring-1 ring-primary/30' : 'p-2',
      )}
      {...interactiveProps}
    >
      <div className="flex gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-sm font-medium text-foreground">You</span>
            <span>{formatRelativeTime(userMessage.time.created)}</span>
            <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
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
              <ForkControls sessionId={sessionId} messageId={userMessage.id} />
            </span>
          </div>
          <div className="space-y-2">
            {userParts.map((part) => (
              <PartRenderer key={part.id} part={part} />
            ))}
          </div>
        </div>
      </div>

      {assistantMessages.length > 0 ? (
        <div className="flex gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
            <Bot className="h-4 w-4 text-secondary-foreground" />
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
              {allAssistantParts.map((part) => (
                <PartRenderer key={part.id} part={part} />
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
})
