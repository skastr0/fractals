'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useSync } from '@/context/SyncProvider'
import { usePartsForMessages } from '@/hooks/useParts'
import { useSession } from '@/hooks/useSession'
import { useSessions } from '@/hooks/useSessions'
import type { ToolPart } from '@/lib/opencode'
import { type FlatItem, type FlatItemsCache, flattenMessages } from '@/lib/session/flat-items'

import { FlatItemRenderer } from './flat-item-renderer'
import { ScrollToBottom } from './scroll-to-bottom'

interface MessageListProps {
  sessionKey: string
}

// Number of recent messages to render immediately for instant pane opening
const INITIAL_MESSAGE_COUNT = 10

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
  // Height measurement cache for stable backward scrolling
  // This prevents the "jumping when scrolling up" issue (TanStack Virtual #659)
  const measurementCache = useRef<Map<number, number>>(new Map())

  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isPinned, setIsPinned] = useState(true)

  // Expansion state management:
  // - userOverrides: explicit user clicks (takes highest priority)
  // - seenWhileStreaming: items that were expanded during streaming (stay expanded after completion)
  const [userOverrides, setUserOverrides] = useState<Map<string, boolean>>(new Map())
  const [seenWhileStreaming, setSeenWhileStreaming] = useState<Set<string>>(new Set())

  // Clear caches when session changes
  useEffect(() => {
    void sessionKey
    flatItemCache.current.clear()
    measurementCache.current.clear()
    setUserOverrides(new Map())
    setSeenWhileStreaming(new Set())
  }, [sessionKey])

  // Helper to check if a part should be expanded by default (for non-streaming, never-interacted items)
  const shouldExpandByDefault = useCallback((item: FlatItem): boolean => {
    if (item.type !== 'part') return false

    const partType = item.part.type

    // Text parts: expand by default (main content users want to see)
    if (partType === 'text') return true

    // Edit tools: expand by default (file changes are important)
    if (partType === 'tool') {
      const toolPart = item.part as ToolPart
      if (toolPart.tool === 'edit') return true
    }

    // Everything else: collapsed by default
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
      // 1. User override takes highest priority (explicit clicks)
      const override = userOverrides.get(item.id)
      if (override !== undefined) {
        return override
      }

      // 2. Currently streaming items are always expanded
      if (item.type === 'part' && item.isStreaming) {
        return true
      }

      // 3. Items that were streaming stay expanded after completion
      if (seenWhileStreaming.has(item.id)) {
        return true
      }

      // 4. Use type-based defaults for items never seen streaming
      return shouldExpandByDefault(item)
    },
    [userOverrides, seenWhileStreaming, shouldExpandByDefault],
  )

  // Memoize sorted messages once
  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.time.created - b.time.created),
    [messages],
  )

  // Progressive loading: start with recent messages, load older ones async
  // This ensures instant pane opening while older content loads in background
  const [isFullyLoaded, setIsFullyLoaded] = useState(false)
  const [loadedMessageCount, setLoadedMessageCount] = useState(INITIAL_MESSAGE_COUNT)

  // Reset loading state when session changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: sessionKey change resets loading state
  useEffect(() => {
    setIsFullyLoaded(false)
    setLoadedMessageCount(INITIAL_MESSAGE_COUNT)
  }, [sessionKey])

  // Progressively load more messages after initial render
  useEffect(() => {
    if (isFullyLoaded || sortedMessages.length <= loadedMessageCount) {
      if (!isFullyLoaded && sortedMessages.length <= loadedMessageCount) {
        setIsFullyLoaded(true)
      }
      return
    }

    // Use startTransition to load older messages without blocking UI
    startTransition(() => {
      setLoadedMessageCount(sortedMessages.length)
      setIsFullyLoaded(true)
    })
  }, [sortedMessages.length, loadedMessageCount, isFullyLoaded])

  // Get messages to render: recent first, then all after loading
  const messagesToRender = useMemo(() => {
    if (isFullyLoaded || sortedMessages.length <= INITIAL_MESSAGE_COUNT) {
      return sortedMessages
    }
    // Show only the last N messages initially for instant render
    return sortedMessages.slice(-loadedMessageCount)
  }, [sortedMessages, loadedMessageCount, isFullyLoaded])

  // Flatten messages to individual items for per-item virtualization
  const flatItems = useMemo(() => {
    return flattenMessages({ messages: messagesToRender, getParts, cache: flatItemCache.current })
  }, [messagesToRender, getParts])

  // Track items that are currently streaming (so they stay expanded after completion)
  useEffect(() => {
    const streamingIds = flatItems
      .filter((item) => item.type === 'part' && item.isStreaming)
      .map((item) => item.id)

    if (streamingIds.length > 0) {
      setSeenWhileStreaming((prev) => {
        // Only update if there are new streaming items to add
        const hasNew = streamingIds.some((id) => !prev.has(id))
        if (!hasNew) return prev

        const next = new Set(prev)
        for (const id of streamingIds) {
          next.add(id)
        }
        return next
      })
    }
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
  // Key fixes for dynamic height stability:
  // 1. Better estimateSize - closer to average expanded size reduces layout shifts
  // 2. Custom measureElement - avoid remeasuring when scrolling backward (prevents jumps)
  // 3. getItemKey - stable keys prevent index-based remeasurement chaos
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    // Better estimate: collapsed ~32px, expanded text ~120px, expanded tool ~200px
    // Using a middle-ground estimate reduces initial layout thrash
    estimateSize: (index) => {
      const item = flatItems[index]
      if (!item || item.type !== 'part') return 40 // Headers/user messages

      // Estimate based on whether item will likely be expanded
      const willExpand =
        userOverrides.get(item.id) ?? seenWhileStreaming.has(item.id) ?? shouldExpandByDefault(item)

      if (!willExpand) return 32 // Collapsed preview row

      // Expanded estimates by part type
      const partType = item.part.type
      if (partType === 'text') return 150 // Text content varies, use reasonable middle
      if (partType === 'tool') return 120 // Tool output
      if (partType === 'reasoning') return 100 // Chain of thought
      return 80 // Other expanded parts
    },
    // Stable keys based on item.id (not index) - critical for dynamic lists
    getItemKey: (index) => flatItems[index]?.id ?? index,
    // Custom measureElement: don't remeasure when scrolling backward
    // This is the fix for the "jumping when scrolling up" issue (TanStack Virtual #659)
    measureElement: (element, _entry, instance) => {
      const indexKey = Number(element.getAttribute('data-index'))
      const direction = instance.scrollDirection

      // When scrolling forward or initially rendering, measure and cache
      if (direction === 'forward' || direction === null) {
        const height = element.getBoundingClientRect().height
        measurementCache.current.set(indexKey, height)
        return height
      }

      // When scrolling backward, prefer cached measurement to prevent jumps
      const cachedSize = measurementCache.current.get(indexKey)
      if (cachedSize !== undefined) {
        return cachedSize
      }

      // Fallback to measurement if no cache
      const height = element.getBoundingClientRect().height
      measurementCache.current.set(indexKey, height)
      return height
    },
    // Aggressive overscan: render 20 items above/below viewport
    // This prevents blank screens during fast scrolling
    overscan: 20,
  })

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = scrollRef.current
    if (!container) {
      return
    }
    container.scrollTo({ top: container.scrollHeight, behavior })
    setIsPinned(true)
  }, [])

  // Use virtualizer's onChange callback for reactive updates instead of manual sync
  // This avoids the queueMicrotask race conditions that cause delayed rendering
  const [virtualizerState, setVirtualizerState] = useState({
    totalSize: 0,
    items: [] as ReturnType<typeof virtualizer.getVirtualItems>,
  })

  // Subscribe to virtualizer changes
  useEffect(() => {
    // Initial sync
    setVirtualizerState({
      totalSize: virtualizer.getTotalSize(),
      items: virtualizer.getVirtualItems(),
    })

    // The virtualizer notifies us through its internal measurement system
    // We use a ResizeObserver on the scroll container to catch size changes
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    const resizeObserver = new ResizeObserver(() => {
      // Debounce rapid resize events
      requestAnimationFrame(() => {
        setVirtualizerState({
          totalSize: virtualizer.getTotalSize(),
          items: virtualizer.getVirtualItems(),
        })
      })
    })

    resizeObserver.observe(scrollElement)
    return () => resizeObserver.disconnect()
  }, [virtualizer])

  // Also update on flatItems changes (new messages, parts)
  // biome-ignore lint/correctness/useExhaustiveDependencies: flatItems.length triggers recalculation when items change
  useEffect(() => {
    // Clear measurement cache when items change significantly
    // This ensures new items get properly measured
    measurementCache.current.clear()

    // Force virtualizer to recalculate
    requestAnimationFrame(() => {
      setVirtualizerState({
        totalSize: virtualizer.getTotalSize(),
        items: virtualizer.getVirtualItems(),
      })
    })
  }, [flatItems.length, virtualizer])

  const { totalSize, items: virtualItems } = virtualizerState

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
    setVirtualizerState({
      totalSize: virtualizer.getTotalSize(),
      items: virtualizer.getVirtualItems(),
    })
  }, [virtualizer])

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>No messages yet.</span>
        <span>Send a prompt to start the session.</span>
      </div>
    )
  }

  // Check if there are older messages still loading
  const hasOlderMessages = !isFullyLoaded && sortedMessages.length > INITIAL_MESSAGE_COUNT

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
          {/* Loading indicator for older messages */}
          {hasOlderMessages && (
            <div className="sticky top-0 z-10 flex items-center justify-center py-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-background/80 px-3 py-1 backdrop-blur-sm">
                Loading older messages...
              </span>
            </div>
          )}
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
