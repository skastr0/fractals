'use client'

import { use$ } from '@legendapp/state/react'
import { useMemo } from 'react'
import { useSync } from '@/context/SyncProvider'
import { parseSessionKey } from '@/lib/utils/session-key'
import type { SessionStatus as SessionStatusName } from '@/types'

export type SessionStatusInput =
  | SessionStatusName
  | {
      type: 'retry'
      attempt?: number
      next?: number
      message?: string
    }
  | {
      type: Exclude<SessionStatusName, 'retry'>
    }

const defaultStatus: SessionStatusInput = { type: 'idle' }

export function useSessionStatus(sessionKey: string): SessionStatusInput {
  const { state$ } = useSync()

  // Resolve the key once (non-reactive lookup)
  const normalizedKey = useMemo(() => {
    const parsed = parseSessionKey(sessionKey)
    if (parsed) {
      return sessionKey
    }

    // Fallback: try to find by session ID (use peek to avoid subscription)
    const sessions = state$.data.sessions.peek()
    const match = Object.entries(sessions ?? {}).find(([, session]) => session.id === sessionKey)
    return match?.[0] ?? sessionKey
  }, [sessionKey, state$])

  // V3: Subscribe directly to the specific key, not the entire status object
  const status = use$(state$.data.sessionStatus[normalizedKey]) as SessionStatusInput | undefined

  return status ?? defaultStatus
}
