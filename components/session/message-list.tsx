'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useSync } from '@/context/SyncProvider'
import { useSession } from '@/hooks/useSession'
import { useSessions } from '@/hooks/useSessions'
import { type FlatItem, flattenMessages } from '@/lib/session/flat-items'

import { FlatItemRenderer } from './flat-item-renderer'
import { ScrollToBottom } from './scroll-to-bottom'

interface MessageListProps {
  sessionKey: string
}

export const MessageList = memo(function MessageList({ sessionKey }: MessageListProps) {
  const { messages, status, isWorking, getParts } = useSession(sessionKey)
  const { sessions: childSessions } = useSessions({ parentId: sessionKey })
  const { state$ } = useSync()

  const scrollRef = useRef<HTMLDivElement>(null)
  const prevStreamingIdsRef = useRef<Set<string>>(new Set())

  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isPinned, setIsPinned] = useState(true)
  const [activeUserMessageId, setActiveUserMessageId] = useState<string | null>(null)

  // Track expanded items by ID - defaults to collapsed (empty set)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Toggle expansion for an item
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Check if an item is expanded (streaming items are always expanded)
  const isExpanded = useCallback(
    (item: FlatItem) => {
      // Streaming items are always expanded (AC-1)
      if (item.type === 'part' && item.isStreaming) {
        return true
      }
      return expandedIds.has(item.id)
    },
    [expandedIds],
  )

  // Memoize sorted messages once
  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.time.created - b.time.created),
    [messages],
  )

  // Flatten messages to individual items for per-item virtualization
  const flatItems = useMemo(
    () => flattenMessages({ messages: sortedMessages, getParts }),
    [sortedMessages, getParts],
  )

  // AC-2: When streaming ends, add item to expandedIds so it stays expanded
  useEffect(() => {
    const currentStreamingIds = new Set(
      flatItems.filter((item) => item.type === 'part' && item.isStreaming).map((item) => item.id),
    )

    // Find items that WERE streaming but are no longer streaming
    const endedStreamingIds = [...prevStreamingIdsRef.current].filter(
      (id) => !currentStreamingIds.has(id),
    )

    // Add them to expandedIds so they stay expanded
    if (endedStreamingIds.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev)
        for (const id of endedStreamingIds) {
          next.add(id)
        }
        return next
      })
    }

    prevStreamingIdsRef.current = currentStreamingIds
  }, [flatItems])

  // Extract user message items for navigation
  const userMessageItems = useMemo(
    () =>
      flatItems.filter(
        (item): item is Extract<FlatItem, { type: 'user-message' }> => item.type === 'user-message',
      ),
    [flatItems],
  )

  // Compute fork counts - count child sessions that reference each message
  const forkCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const child of childSessions) {
      const allMessages = state$.data.messages.peek()
      const childMessages = allMessages?.[child.sessionKey] ?? []
      for (const message of childMessages) {
        counts.set(message.id, (counts.get(message.id) ?? 0) + 1)
      }
    }
    return counts
  }, [childSessions, state$])

  // Virtualizer for efficient rendering - now over flat items with smaller estimated size
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40, // Collapsed height ~40px (vs 200px for turns)
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 5, // Render 5 extra items above/below viewport
  })

  // Set initial active user message
  useEffect(() => {
    if (userMessageItems.length === 0) {
      setActiveUserMessageId(null)
      return
    }

    setActiveUserMessageId((prev) => {
      if (prev === null || !userMessageItems.some((item) => item.message.id === prev)) {
        return userMessageItems[userMessageItems.length - 1]?.message.id ?? null
      }
      return prev
    })
  }, [userMessageItems])

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
    if (isPinned && flatItems.length > 0 && totalSize > 0) {
      // Use instant scroll for auto-follow to avoid jank
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'instant',
      })
    }
  }, [isPinned, flatItems.length, totalSize])

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

  // Navigate between user messages
  const navigateMessage = useCallback(
    (offset: number) => {
      if (userMessageItems.length === 0) {
        return
      }

      const currentIndex = activeUserMessageId
        ? userMessageItems.findIndex((item) => item.message.id === activeUserMessageId)
        : userMessageItems.length - 1

      const nextIndex = Math.max(0, Math.min(userMessageItems.length - 1, currentIndex + offset))
      const nextItem = userMessageItems[nextIndex]

      if (nextItem) {
        setActiveUserMessageId(nextItem.message.id)
        const element = document.getElementById(`message-${nextItem.message.id}`)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    },
    [userMessageItems, activeUserMessageId],
  )

  // Get current navigation index for display
  const currentNavIndex = useMemo(() => {
    if (!activeUserMessageId) return userMessageItems.length - 1
    const index = userMessageItems.findIndex((item) => item.message.id === activeUserMessageId)
    return index >= 0 ? index : userMessageItems.length - 1
  }, [activeUserMessageId, userMessageItems])

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

      {userMessageItems.length > 1 ? (
        <div className="flex flex-shrink-0 items-center justify-center gap-2 border-b border-border py-2">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => navigateMessage(-1)}
            isDisabled={currentNavIndex === 0}
            aria-label="Previous message"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentNavIndex + 1} / {userMessageItems.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => navigateMessage(1)}
            isDisabled={currentNavIndex === userMessageItems.length - 1}
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
              const item = flatItems[virtualRow.index]
              if (!item) return null

              // Get fork count for user messages
              const forkCount =
                item.type === 'user-message' ? (forkCounts.get(item.message.id) ?? 0) : undefined

              // Check if this is the active user message
              const isActiveUserMessage =
                item.type === 'user-message' && item.message.id === activeUserMessageId

              return (
                <div key={item.id} data-index={virtualRow.index} ref={virtualizer.measureElement}>
                  <FlatItemRenderer
                    item={item}
                    sessionKey={sessionKey}
                    forkCount={forkCount}
                    isActiveUserMessage={isActiveUserMessage}
                    isExpanded={isExpanded(item)}
                    onToggle={() => toggleExpand(item.id)}
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
