'use client'

import { useSync } from '@/context/SyncProvider'
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

export function useSessionStatus(sessionId: string): SessionStatusInput {
  const sync = useSync()
  const status = sync.data.sessionStatus[sessionId] as SessionStatusInput | undefined

  return status ?? defaultStatus
}
