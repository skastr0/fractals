'use client'

import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useSync } from '@/context/SyncProvider'
import { useSession } from '@/hooks/useSession'
import { useSessions } from '@/hooks/useSessions'
import type { Message, UserMessage } from '@/lib/opencode'

import { MessageTurn } from './message-turn'
import { ScrollToBottom } from './scroll-to-bottom'

interface MessageListProps {
  sessionId: string
}

const isUserMessage = (message: Message): message is UserMessage => message.role === 'user'

export const MessageList = memo(function MessageList({ sessionId }: MessageListProps) {
  const { messages, status, isWorking } = useSession(sessionId)
  const { sessions: childSessions } = useSessions({ parentId: sessionId })
  const sync = useSync()

  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isPinned, setIsPinned] = useState(true)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const userMessages = useMemo(() => {
    return [...messages].filter(isUserMessage).sort((a, b) => a.time.created - b.time.created)
  }, [messages])

  const forkCounts = useMemo(() => {
    const counts = new Map<string, number>()

    for (const child of childSessions) {
      const childMessages = sync.data.messages[child.id] ?? []
      for (const message of childMessages) {
        counts.set(message.id, (counts.get(message.id) ?? 0) + 1)
      }
    }

    return counts
  }, [childSessions, sync.data.messages])

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

  useEffect(() => {
    const container = scrollRef.current
    const content = contentRef.current

    if (!container || !content || typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(() => {
      if (isPinned) {
        container.scrollTop = container.scrollHeight
      }
    })

    observer.observe(content)
    return () => observer.disconnect()
  }, [isPinned])

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

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto" onScroll={handleScroll}>
        <div ref={contentRef} className="flex flex-col gap-4 p-4 pb-32">
          {userMessages.map((userMessage, index) => (
            <MessageTurn
              key={userMessage.id}
              sessionId={sessionId}
              userMessage={userMessage}
              forkCount={forkCounts.get(userMessage.id) ?? 0}
              isActive={activeIndex === index}
              onSelect={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>

      {showScrollButton ? <ScrollToBottom onClick={() => scrollToBottom('smooth')} /> : null}
    </div>
  )
})
