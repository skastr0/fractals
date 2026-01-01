'use client'

import { useCallback, useMemo } from 'react'
import { useSync } from '@/context/SyncProvider'
import type { Message, Part, Session, SessionStatus } from '@/lib/opencode'
import { type SendMessageOptions, sessionService } from '@/lib/opencode/sessions'

const idleStatus: SessionStatus = { type: 'idle' }

export interface UseSessionResult {
  session?: Session
  messages: Message[]
  status: SessionStatus
  getParts: (messageId: string) => Part[]
  sendMessage: (
    content: string,
    options?: Omit<SendMessageOptions, 'sessionId' | 'content'>,
  ) => Promise<void>
  abort: () => Promise<void>
  fork: (messageId: string) => Promise<Session>
  isLoading: boolean
  isWorking: boolean
}

export function useSession(sessionId: string | undefined): UseSessionResult {
  const sync = useSync()

  const session = useMemo(() => {
    if (!sessionId) {
      return undefined
    }
    return sync.data.sessions[sessionId]
  }, [sync.data.sessions, sessionId])

  const messages = useMemo(() => {
    if (!sessionId) {
      return []
    }
    return sync.data.messages[sessionId] ?? []
  }, [sync.data.messages, sessionId])

  const status = useMemo(() => {
    if (!sessionId) {
      return idleStatus
    }
    return sync.data.sessionStatus[sessionId] ?? idleStatus
  }, [sync.data.sessionStatus, sessionId])

  const getParts = useCallback(
    (messageId: string): Part[] => sync.data.parts[messageId] ?? [],
    [sync.data.parts],
  )

  const sendMessage = useCallback(
    async (content: string, options?: Omit<SendMessageOptions, 'sessionId' | 'content'>) => {
      if (!sessionId) {
        throw new Error('No session selected')
      }
      await sessionService.sendMessage({
        sessionId,
        content,
        ...options,
      })
    },
    [sessionId],
  )

  const abort = useCallback(async () => {
    if (!sessionId) {
      return
    }
    await sessionService.abort(sessionId)
  }, [sessionId])

  const fork = useCallback(
    async (messageId: string) => {
      if (!sessionId) {
        throw new Error('No session selected')
      }
      return sessionService.fork({ sessionId, messageId })
    },
    [sessionId],
  )

  return {
    session,
    messages,
    status,
    getParts,
    sendMessage,
    abort,
    fork,
    isLoading: Boolean(sessionId && !session),
    isWorking: status.type !== 'idle',
  }
}
