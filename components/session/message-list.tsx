'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useSync } from '@/context/SyncProvider'
import { usePartsForMessages } from '@/hooks/useParts'
import { useSession } from '@/hooks/useSession'
import { useSessions } from '@/hooks/useSessions'
import { type FlatItem, type FlatItemsCache, flattenMessages } from '@/lib/session/flat-items'

import { FlatItemRenderer } from './flat-item-renderer'
import { ScrollToBottom } from './scroll-to-bottom'

interface MessageListProps {
  sessionKey: string
}

export const MessageList = memo(function MessageList({ sessionKey }: MessageListProps) {
  const { messages } = useSession(sessionKey)
  const { sessions: childSessions } = useSessions({ parentId: sessionKey })
  const { state$ } = useSync()

  // Extract all message IDs for reactive parts subscription
  const messageIds = useMemo(() => messages.map((m) => m.id), [messages])
  // Subscribe only to parts for current message IDs
  const { getParts } = usePartsForMessages(messageIds)

  const scrollRef = useRef<HTMLDivElement>(null)
  const flatItemCache = useRef<FlatItemsCache>(new Map())

  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isPinned, setIsPinned] = useState(true)

  // Simple expansion state: user overrides (true = force expanded, false = force collapsed)
  // If not in map, use default behavior
  const [userOverrides, setUserOverrides] = useState<Map<string, boolean>>(new Map())

  useEffect(() => {
    void sessionKey
    flatItemCache.current.clear()
  }, [sessionKey])

  // Helper to check if a part should be expanded by default
  const shouldExpandByDefault = useCallback((item: FlatItem): boolean => {
    if (item.type !== 'part') return false

    // Non-streaming parts default to collapsed (streaming handled elsewhere)
    return false
  }, [])

  // Toggle expansion for an item - simple flip
  const toggleExpand = useCallback((id: string, currentlyExpanded: boolean) => {
    setUserOverrides((prev) => {
      const next = new Map(prev)
      next.set(id, !currentlyExpanded)
      return next
    })
  }, [])

  // Check if an item is expanded
  const getIsExpanded = useCallback(
    (item: FlatItem): boolean => {
      // Streaming items are always expanded
      if (item.type === 'part' && item.isStreaming) {
        return true
      }

      // Check for user override
      const override = userOverrides.get(item.id)
      if (override !== undefined) {
        return override
      }

      // Use default behavior
      return shouldExpandByDefault(item)
    },
    [userOverrides, shouldExpandByDefault],
  )

  // Memoize sorted messages once
  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.time.created - b.time.created),
    [messages],
  )

  // Flatten messages to individual items for per-item virtualization
  const flatItems = useMemo(() => {
    return flattenMessages({ messages: sortedMessages, getParts, cache: flatItemCache.current })
  }, [sortedMessages, getParts])

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

  // Virtualizer for efficient rendering
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32, // Compact collapsed height
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 5,
  })

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = scrollRef.current
    if (!container) {
      return
    }
    container.scrollTo({ top: container.scrollHeight, behavior })
    setIsPinned(true)
  }, [])

  // Track virtualizer state to avoid flushSync during render
  // Both getTotalSize() and getVirtualItems() call flushSync internally
  const [totalSize, setTotalSize] = useState(0)
  const [virtualItems, setVirtualItems] = useState<ReturnType<typeof virtualizer.getVirtualItems>>(
    [],
  )

  // Sync virtualizer state outside React's lifecycle to avoid flushSync conflicts
  // queueMicrotask defers execution until after React's commit phase completes
  // biome-ignore lint/correctness/useExhaustiveDependencies: flatItems.length triggers remeasurement when items change
  useEffect(() => {
    queueMicrotask(() => {
      setTotalSize(virtualizer.getTotalSize())
      setVirtualItems(virtualizer.getVirtualItems())
    })
  }, [virtualizer, flatItems.length])

  // Auto-scroll to bottom when pinned and content height changes
  useEffect(() => {
    if (isPinned && flatItems.length > 0 && totalSize > 0) {
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

    // Update virtual items on scroll (outside render phase, so safe to call)
    setVirtualItems(virtualizer.getVirtualItems())
    setTotalSize(virtualizer.getTotalSize())
  }, [virtualizer])

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
            height: totalSize,
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
              transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
            }}
          >
            {virtualItems.map((virtualRow) => {
              const item = flatItems[virtualRow.index]
              if (!item) return null

              // Get fork count for user messages
              const forkCount =
                item.type === 'user-message' ? (forkCounts.get(item.message.id) ?? 0) : undefined

              const expanded = getIsExpanded(item)

              return (
                <div key={item.id} data-index={virtualRow.index} ref={virtualizer.measureElement}>
                  <FlatItemRenderer
                    item={item}
                    sessionKey={sessionKey}
                    forkCount={forkCount}
                    isExpanded={expanded}
                    onToggle={() => toggleExpand(item.id, expanded)}
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
