'use client'

import { use$ } from '@legendapp/state/react'
import { useCallback, useMemo } from 'react'
import { useOpenCode } from '@/context/OpenCodeProvider'
import { useProject } from '@/context/ProjectProvider'
import { useSync } from '@/context/SyncProvider'
import type { Message, Part, Session, SessionStatus } from '@/lib/opencode'
import type { SendMessageOptions } from '@/lib/opencode/sessions'
import { resolveSessionKey } from '@/lib/utils/session-key'

const idleStatus: SessionStatus = { type: 'idle' }

type PromptPart =
  | { type: 'text'; text: string }
  | { type: 'file'; mime: string; url: string; filename?: string }

export interface UseSessionResult {
  session?: Session
  messages: Message[]
  status: SessionStatus
  getParts: (messageId: string) => Part[]
  sendMessage: (
    content: string,
    options?: Omit<SendMessageOptions, 'sessionId' | 'content' | 'directory'>,
  ) => Promise<void>
  abort: () => Promise<void>
  fork: (messageId: string) => Promise<Session>
  isLoading: boolean
  isWorking: boolean
}

export function useSession(sessionKey: string | undefined): UseSessionResult {
  const { client } = useOpenCode()
  const { state$ } = useSync()
  const { projects } = useProject()

  // Resolve the session key to get directory and sessionId
  const sessionLookup = useMemo(() => {
    if (!sessionKey) {
      return null
    }

    const resolved = resolveSessionKey(sessionKey, projects)
    if (resolved) {
      return { sessionKey, ...resolved }
    }

    // Fallback: try to find by session ID in any project
    // Use peek() to avoid subscription here - we just need the lookup
    const sessions = state$.data.sessions.peek()
    const match = Object.entries(sessions).find(([, session]) => session.id === sessionKey)
    if (!match) {
      return null
    }

    const [resolvedKey] = match
    const resolvedFromMetadata = resolveSessionKey(resolvedKey, projects)
    if (!resolvedFromMetadata) {
      return null
    }

    return { sessionKey: resolvedKey, ...resolvedFromMetadata }
  }, [projects, sessionKey, state$])

  const normalizedKey = sessionLookup?.sessionKey ?? null

  // ==========================================================================
  // FINE-GRAINED SUBSCRIPTIONS - Only re-render when THIS session's data changes
  // V3: Subscribe directly to the key, not the parent object
  // ==========================================================================

  // Subscribe to just this session - Legend State V3 granular subscription
  // This subscribes ONLY to state$.data.sessions[normalizedKey], not all sessions
  const session = use$(normalizedKey ? state$.data.sessions[normalizedKey] : undefined) as
    | Session
    | undefined

  // Subscribe to just this session's messages
  const messages =
    (use$(normalizedKey ? state$.data.messages[normalizedKey] : undefined) as
      | Message[]
      | undefined) ?? []

  // Subscribe to just this session's status
  const rawStatus = use$(normalizedKey ? state$.data.sessionStatus[normalizedKey] : undefined) as
    | SessionStatus
    | undefined
  const status = rawStatus ?? idleStatus

  // getParts reads from state without subscribing (called during render after messages subscription)
  const getParts = useCallback(
    (messageId: string): Part[] => {
      const allParts = state$.data.parts.peek()
      return allParts?.[messageId] ?? []
    },
    [state$],
  )

  const sendMessage = useCallback(
    async (
      content: string,
      options?: Omit<SendMessageOptions, 'sessionId' | 'content' | 'directory'>,
    ) => {
      if (!sessionLookup) {
        throw new Error('No session selected')
      }
      if (!client) {
        throw new Error('Not connected to OpenCode server')
      }

      const parts: PromptPart[] = [{ type: 'text', text: content }]

      if (options?.files) {
        for (const file of options.files) {
          parts.push({
            type: 'file',
            mime: file.mime,
            url: file.url,
            filename: file.filename,
          })
        }
      }

      await client.session.prompt(
        {
          sessionID: sessionLookup.sessionId,
          parts,
          directory: sessionLookup.directory,
          ...(options?.agent ? { agent: options.agent } : {}),
          ...(options?.model ? { model: options.model } : {}),
          ...(options?.variant ? { variant: options.variant } : {}),
        },
        { throwOnError: true },
      )
    },
    [client, sessionLookup],
  )

  const abort = useCallback(async () => {
    if (!sessionLookup || !client) {
      return
    }
    await client.session.abort(
      { sessionID: sessionLookup.sessionId, directory: sessionLookup.directory },
      { throwOnError: true },
    )
  }, [client, sessionLookup])

  const fork = useCallback(
    async (messageId: string) => {
      if (!sessionLookup) {
        throw new Error('No session selected')
      }
      if (!client) {
        throw new Error('Not connected to OpenCode server')
      }
      const result = await client.session.fork(
        {
          sessionID: sessionLookup.sessionId,
          messageID: messageId,
          directory: sessionLookup.directory,
        },
        { throwOnError: true },
      )
      return result.data
    },
    [client, sessionLookup],
  )

  return {
    session,
    messages,
    status,
    getParts,
    sendMessage,
    abort,
    fork,
    isLoading: Boolean(sessionKey && !session),
    isWorking: status.type !== 'idle',
  }
}
