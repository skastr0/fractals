'use client'

import { Bot, GitFork, User } from 'lucide-react'
import { type KeyboardEvent, memo, useCallback, useMemo } from 'react'

import { useSession } from '@/hooks/useSession'
import type { AssistantMessage, UserMessage } from '@/lib/opencode'
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

  const assistantMessage = useMemo(() => {
    return messages.find(
      (message): message is AssistantMessage =>
        message.role === 'assistant' && message.parentID === userMessage.id,
    )
  }, [messages, userMessage.id])

  const userParts = getParts(userMessage.id)
  const assistantParts = assistantMessage ? getParts(assistantMessage.id) : []

  const assistantErrorMessage = useMemo(() => {
    if (!assistantMessage?.error) {
      return null
    }

    const error = assistantMessage.error
    if (typeof error === 'object' && error && 'data' in error) {
      const data = error.data as { message?: string }
      if (data?.message) {
        return data.message
      }
    }

    return error.name ?? 'Error'
  }, [assistantMessage?.error])

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

      {assistantMessage ? (
        <div className="flex gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
            <Bot className="h-4 w-4 text-secondary-foreground" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-sm font-medium text-foreground">Assistant</span>
              <span>
                {assistantMessage.providerID}/{assistantMessage.modelID}
              </span>
              {assistantMessage.agent ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {assistantMessage.agent}
                </span>
              ) : null}
            </div>
            <div className="space-y-2">
              {assistantParts.map((part) => (
                <PartRenderer key={part.id} part={part} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatRelativeTime(assistantMessage.time.created)}</span>
              <span className="font-mono">
                in {assistantMessage.tokens.input} / out {assistantMessage.tokens.output}
              </span>
              {assistantMessage.cost > 0 ? (
                <span className="font-mono">${assistantMessage.cost.toFixed(4)}</span>
              ) : null}
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
