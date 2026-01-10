'use client'

import { useCallback, useEffect, useRef } from 'react'

import { useSync } from '@/context/SyncProvider'

const BATCH_SIZE = 5
const BATCH_DELAY_MS = 100
const IDLE_TIMEOUT_MS = 2000

interface UsePreloadPreviewsOptions {
  sessionKeys: string[]
  enabled?: boolean
}

/**
 * Preloads message previews for sessions in the background.
 * Uses requestIdleCallback to avoid blocking the UI.
 */
export function usePreloadPreviews({ sessionKeys, enabled = true }: UsePreloadPreviewsOptions) {
  const { state$, syncSession } = useSync()
  const loadingRef = useRef<Set<string>>(new Set())
  const queueRef = useRef<string[]>([])
  const processingRef = useRef(false)
  const syncSessionRef = useRef(syncSession)
  syncSessionRef.current = syncSession

  const processBatch = useCallback(() => {
    if (queueRef.current.length === 0) {
      processingRef.current = false
      return
    }

    processingRef.current = true

    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleWork =
      typeof requestIdleCallback !== 'undefined'
        ? (cb: () => void) => requestIdleCallback(cb, { timeout: IDLE_TIMEOUT_MS })
        : (cb: () => void) => setTimeout(cb, BATCH_DELAY_MS)

    scheduleWork(() => {
      const batch = queueRef.current.splice(0, BATCH_SIZE)

      // Mark as loading
      for (const key of batch) {
        loadingRef.current.add(key)
      }

      // Fire off requests (non-blocking)
      Promise.all(
        batch.map(async (key) => {
          try {
            await syncSessionRef.current(key)
          } catch {
            // Ignore errors - preview just won't show
          } finally {
            loadingRef.current.delete(key)
          }
        }),
      ).then(() => {
        // Schedule next batch after a delay
        setTimeout(processBatch, BATCH_DELAY_MS)
      })
    })
  }, [])

  useEffect(() => {
    if (!enabled || sessionKeys.length === 0) {
      return
    }

    // Find sessions that don't have messages loaded yet
    const messagesSnapshot = state$.data.messages.peek() ?? {}
    const needsPreload = sessionKeys.filter((key) => {
      // Skip if already loading or already has messages
      if (loadingRef.current.has(key)) {
        return false
      }
      const messages = messagesSnapshot[key]
      return !messages || messages.length === 0
    })

    if (needsPreload.length === 0) {
      return
    }

    // Add to queue (dedupe)
    const existingSet = new Set(queueRef.current)
    for (const key of needsPreload) {
      if (!existingSet.has(key)) {
        queueRef.current.push(key)
      }
    }

    // Start processing if not already
    if (!processingRef.current) {
      processBatch()
    }
  }, [enabled, processBatch, sessionKeys, state$])
}
