'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useSync } from '@/context/SyncProvider'
import { useSession } from '@/hooks/useSession'
import { useSessions } from '@/hooks/useSessions'
import type { AssistantMessage, Message, Part, UserMessage } from '@/lib/opencode'

import { MessageTurn, type TurnData } from './message-turn'
import { ScrollToBottom } from './scroll-to-bottom'

// Memoized single turn component to prevent re-computation
const VirtualizedTurn = memo(function VirtualizedTurn({
  userMessage,
  assistantMessages,
  getParts,
  sessionKey,
  forkCount,
  isActive,
  onSelect,
}: {
  userMessage: UserMessage
  assistantMessages: AssistantMessage[]
  getParts: (messageId: string) => Part[]
  sessionKey: string
  forkCount: number
  isActive: boolean
  onSelect: () => void
}) {
  // TurnData computed once per message, only re-computed when deps change
  const turnData = useMemo<TurnData>(() => {
    const userParts = getParts(userMessage.id)
    const assistantParts: Part[] = []
    for (const msg of assistantMessages) {
      assistantParts.push(...getParts(msg.id))
    }
    return {
      userMessage,
      userParts,
      assistantMessages,
      assistantParts,
    }
  }, [userMessage, assistantMessages, getParts])

  return (
    <MessageTurn
      sessionKey={sessionKey}
      turnData={turnData}
      forkCount={forkCount}
      isActive={isActive}
      onSelect={onSelect}
    />
  )
})

interface MessageListProps {
  sessionKey: string
}

const isUserMessage = (message: Message): message is UserMessage => message.role === 'user'
const isAssistantMessage = (message: Message): message is AssistantMessage =>
  message.role === 'assistant'

export const MessageList = memo(function MessageList({ sessionKey }: MessageListProps) {
  const { messages, status, isWorking, getParts } = useSession(sessionKey)
  const { sessions: childSessions } = useSessions({ parentId: sessionKey })
  const { state$ } = useSync()

  const scrollRef = useRef<HTMLDivElement>(null)

  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isPinned, setIsPinned] = useState(true)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Memoize sorted messages once
  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.time.created - b.time.created),
    [messages],
  )

  // Fast O(n) categorization - only groups messages, NO getParts() calls
  const { userMessages, assistantByParent, forkCounts } = useMemo(() => {
    const users: UserMessage[] = []
    const byParent = new Map<string, AssistantMessage[]>()

    // Single pass to categorize messages
    for (const message of sortedMessages) {
      if (isUserMessage(message)) {
        users.push(message)
      } else if (isAssistantMessage(message) && message.parentID) {
        const existing = byParent.get(message.parentID) ?? []
        existing.push(message)
        byParent.set(message.parentID, existing)
      }
    }

    // Sort assistant messages by ID for each parent (maintains order)
    for (const [parentId, assistants] of byParent) {
      byParent.set(
        parentId,
        assistants.sort((a, b) => a.id.localeCompare(b.id)),
      )
    }

    // Compute fork counts using peek() to avoid subscription - only re-compute when childSessions change
    const counts = new Map<string, number>()
    for (const child of childSessions) {
      const allMessages = state$.data.messages.peek()
      const childMessages = allMessages?.[child.sessionKey] ?? []
      for (const message of childMessages) {
        counts.set(message.id, (counts.get(message.id) ?? 0) + 1)
      }
    }

    return { userMessages: users, assistantByParent: byParent, forkCounts: counts }
  }, [sortedMessages, childSessions, state$])

  // Virtualizer for efficient rendering of large message lists
  // Now virtualizing over userMessages directly - TurnData computed lazily
  const virtualizer = useVirtualizer({
    count: userMessages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 200, // Estimated height per turn
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 3, // Render 3 extra items above/below viewport
  })

  useEffect(() => {
    if (userMessages.length === 0) {
      setActiveIndex(null)
      return
    }

    setActiveIndex((prev) => {
      if (prev === null) {
        return userMessages.length - 1
      }
      return Math.min(prev, userMessages.length - 1)
    })
  }, [userMessages.length])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = scrollRef.current
    if (!container) {
      return
    }
    container.scrollTo({ top: container.scrollHeight, behavior })
    setIsPinned(true)
  }, [])

  // Track virtualizer total size for auto-scroll
  const totalSize = virtualizer.getTotalSize()

  // Auto-scroll to bottom when pinned and content height changes
  useEffect(() => {
    if (isPinned && userMessages.length > 0 && totalSize > 0) {
      // Use instant scroll for auto-follow to avoid jank
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'instant',
      })
    }
  }, [isPinned, userMessages.length, totalSize])

  const handleScroll = useCallback(() => {
    const container = scrollRef.current
    if (!container) {
      return
    }

    const { scrollTop, scrollHeight, clientHeight } = container
    const atBottom = scrollHeight - scrollTop - clientHeight < 80

    setIsPinned(atBottom)
    setShowScrollButton(!atBottom)
  }, [])

  const navigateMessage = useCallback(
    (offset: number) => {
      if (userMessages.length === 0) {
        return
      }

      setActiveIndex((prev) => {
        const currentIndex = prev ?? userMessages.length - 1
        const nextIndex = Math.max(0, Math.min(userMessages.length - 1, currentIndex + offset))
        const messageId = userMessages[nextIndex]?.id

        if (messageId) {
          const element = document.getElementById(`message-${messageId}`)
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }

        return nextIndex
      })
    },
    [userMessages],
  )

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>No messages yet.</span>
        <span>Send a prompt to start the session.</span>
      </div>
    )
  }

  return (
    <div className="relative flex h-full max-h-full min-h-0 flex-col overflow-hidden">
      {isWorking ? (
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2 text-xs text-primary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{status.type === 'retry' ? 'Retrying...' : 'Generating response...'}</span>
        </div>
      ) : null}

      {userMessages.length > 1 ? (
        <div className="flex flex-shrink-0 items-center justify-center gap-2 border-b border-border py-2">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => navigateMessage(-1)}
            isDisabled={(activeIndex ?? userMessages.length - 1) === 0}
            aria-label="Previous message"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {(activeIndex ?? userMessages.length - 1) + 1} / {userMessages.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => navigateMessage(1)}
            isDisabled={(activeIndex ?? userMessages.length - 1) === userMessages.length - 1}
            aria-label="Next message"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {/* Virtualized scroll container */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={handleScroll}
        style={{ contain: 'strict' }}
      >
        {/* Total size container for proper scrollbar */}
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Positioned container for visible items */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualizer.getVirtualItems()[0]?.start ?? 0}px)`,
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const userMessage = userMessages[virtualRow.index]
              if (!userMessage) return null

              const assistantMsgs = assistantByParent.get(userMessage.id) ?? []

              return (
                <div
                  key={userMessage.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="p-4"
                >
                  <VirtualizedTurn
                    userMessage={userMessage}
                    assistantMessages={assistantMsgs}
                    getParts={getParts}
                    sessionKey={sessionKey}
                    forkCount={forkCounts.get(userMessage.id) ?? 0}
                    isActive={activeIndex === virtualRow.index}
                    onSelect={() => setActiveIndex(virtualRow.index)}
                  />
                </div>
              )
            })}
            {/* Bottom padding for scroll space */}
            <div className="h-32" aria-hidden="true" />
          </div>
        </div>
      </div>

      {showScrollButton ? <ScrollToBottom onClick={() => scrollToBottom('smooth')} /> : null}
    </div>
  )
})
