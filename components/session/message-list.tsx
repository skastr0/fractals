'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
  const { messages, getParts } = useSession(sessionKey)
  const { sessions: childSessions } = useSessions({ parentId: sessionKey })
  const { state$ } = useSync()

  const scrollRef = useRef<HTMLDivElement>(null)
  const prevStreamingIdsRef = useRef<Set<string>>(new Set())

  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isPinned, setIsPinned] = useState(true)

  // Track expanded items by ID (user explicitly expanded)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  // Track collapsed items by ID (user explicitly collapsed)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

  // Helper to check if a part should be expanded by default
  const shouldExpandByDefault = useCallback((item: FlatItem): boolean => {
    if (item.type !== 'part') return false
    // Patches/diffs are expanded by default
    if (item.part.type === 'patch') return true
    // Non-synthetic text (agent responses) are expanded by default
    if (item.part.type === 'text' && !item.isSynthetic) return true
    return false
  }, [])

  // Toggle expansion for an item
  const toggleExpand = useCallback(
    (id: string, item: FlatItem) => {
      const isDefaultExpanded = shouldExpandByDefault(item)

      if (isDefaultExpanded) {
        // Item is expanded by default, so toggle means collapse
        setCollapsedIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) {
            next.delete(id) // Was collapsed, now expand (back to default)
          } else {
            next.add(id) // Collapse it
          }
          return next
        })
        // Ensure it's not in expandedIds
        setExpandedIds((prev) => {
          if (prev.has(id)) {
            const next = new Set(prev)
            next.delete(id)
            return next
          }
          return prev
        })
      } else {
        // Item is collapsed by default, so toggle means expand
        setExpandedIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) {
            next.delete(id) // Was expanded, now collapse (back to default)
          } else {
            next.add(id) // Expand it
          }
          return next
        })
        // Ensure it's not in collapsedIds
        setCollapsedIds((prev) => {
          if (prev.has(id)) {
            const next = new Set(prev)
            next.delete(id)
            return next
          }
          return prev
        })
      }
    },
    [shouldExpandByDefault],
  )

  // Check if an item is expanded
  const isExpanded = useCallback(
    (item: FlatItem) => {
      // Streaming items are always expanded
      if (item.type === 'part' && item.isStreaming) {
        return true
      }
      // Check if user has explicitly expanded this item
      if (expandedIds.has(item.id)) {
        return true
      }
      // Check if user has explicitly collapsed this item
      if (collapsedIds.has(item.id)) {
        return false
      }
      // DEFAULT EXPANDED: Patches/diffs and non-synthetic text
      if (shouldExpandByDefault(item)) {
        return true
      }
      // Everything else collapsed by default
      return false
    },
    [expandedIds, collapsedIds, shouldExpandByDefault],
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

  // When streaming ends, add item to expandedIds so it stays expanded
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

  // Track virtualizer total size for auto-scroll
  const totalSize = virtualizer.getTotalSize()

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
  }, [])

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

              return (
                <div key={item.id} data-index={virtualRow.index} ref={virtualizer.measureElement}>
                  <FlatItemRenderer
                    item={item}
                    sessionKey={sessionKey}
                    forkCount={forkCount}
                    isExpanded={isExpanded(item)}
                    onToggle={() => toggleExpand(item.id, item)}
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
