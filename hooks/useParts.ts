'use client'

import { use$ } from '@legendapp/state/react'
import { useCallback, useMemo } from 'react'
import { useSync } from '@/context/SyncProvider'
import type { Part } from '@/lib/opencode'

type PartsByMessage = Record<string, Part[]>

export type PartsForMessagesResult = {
  getParts: (messageId: string) => Part[]
  partsByMessage: PartsByMessage
}

/**
 * Subscribe to parts for specific message IDs.
 *
 * This creates reactive subscriptions scoped to the provided message IDs,
 * avoiding re-renders from unrelated parts.
 *
 * @param messageIds - Array of message IDs to get parts for
 * @returns Object with getParts and partsByMessage snapshot
 */
export function usePartsForMessages(messageIds: string[]): PartsForMessagesResult {
  const { state$ } = useSync()

  const partsByMessage = use$((): PartsByMessage => {
    const next: PartsByMessage = {}
    for (const messageId of messageIds) {
      const parts = state$.data.parts[messageId]?.get() as Part[] | undefined
      next[messageId] = parts ?? []
    }
    return next
  })

  const getParts = useCallback(
    (messageId: string): Part[] => partsByMessage[messageId] ?? [],
    [partsByMessage],
  )

  return useMemo(() => ({ getParts, partsByMessage }), [getParts, partsByMessage])
}

/**
 * Get parts for a single message ID with reactive subscription.
 *
 * This is more efficient than usePartsForMessages when you only
 * need parts for one message, as it subscribes to just that key.
 */
export function useMessageParts(messageId: string | undefined): Part[] {
  const { state$ } = useSync()

  const parts = use$(messageId ? state$.data.parts[messageId] : undefined) as Part[] | undefined

  return parts ?? []
}

/**
 * Subscribe to parts for the current session's messages.
 *
 * This is a convenience hook that combines message IDs extraction
 * with parts subscription.
 *
 * @param messages - Array of messages to get parts for
 * @returns Object with getParts and partsByMessage snapshot
 */
export function useSessionParts(messages: { id: string }[]): PartsForMessagesResult {
  const messageIds = useMemo(() => messages.map((m) => m.id), [messages])
  return usePartsForMessages(messageIds)
}
