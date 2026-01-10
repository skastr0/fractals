'use client'

import { use$ } from '@legendapp/state/react'
import { useMemo } from 'react'
import { useSync } from '@/context/SyncProvider'
import type { Part } from '@/lib/opencode'

/**
 * Subscribe to ALL parts and derive parts for specific message IDs.
 *
 * This creates a reactive subscription to the parts store.
 * When any part updates, this hook will re-evaluate.
 *
 * For large applications with many messages, consider using
 * useMessageParts for individual messages instead.
 *
 * @param messageIds - Array of message IDs to get parts for
 * @returns Function to get parts by message ID (getParts)
 */
export function usePartsForMessages(_messageIds: string[]): (messageId: string) => Part[] {
  const { state$ } = useSync()

  // Subscribe to the entire parts store
  // This will re-render when ANY part changes
  const allParts = use$(state$.data.parts) as Record<string, Part[]> | undefined

  // Return a stable getter function
  return useMemo(() => {
    return (messageId: string): Part[] => {
      return allParts?.[messageId] ?? []
    }
  }, [allParts])
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
 * @returns Function to get parts by message ID
 */
export function useSessionParts(messages: { id: string }[]): (messageId: string) => Part[] {
  const messageIds = useMemo(() => messages.map((m) => m.id), [messages])
  return usePartsForMessages(messageIds)
}
