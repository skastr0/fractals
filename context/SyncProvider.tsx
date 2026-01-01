'use client'

import { useObservable, useSelector } from '@legendapp/state/react'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import type { Event, Message, Part, Session, SessionStatus } from '@/lib/opencode'
import { useOpenCode } from './OpenCodeProvider'
import { useProject } from './ProjectProvider'

const RECONNECT_DELAY_MS = 5000

export interface SyncData {
  sessions: Record<string, Session>
  messages: Record<string, Message[]>
  parts: Record<string, Part[]>
  sessionStatus: Record<string, SessionStatus>
}

export interface SyncContextValue {
  data: SyncData
  session: {
    get: (id: string) => Session | undefined
    list: () => Session[]
    sync: (id: string) => Promise<void>
  }
  isConnected: boolean
  lastEvent: Event | null
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const { client } = useOpenCode()
  const { currentProject } = useProject()
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const state$ = useObservable({
    data: {
      sessions: {} as Record<string, Session>,
      messages: {} as Record<string, Message[]>,
      parts: {} as Record<string, Part[]>,
      sessionStatus: {} as Record<string, SessionStatus>,
    },
    isConnected: false,
    lastEvent: null as Event | null,
  })

  const resetData = useCallback(() => {
    state$.data.sessions.set({})
    state$.data.messages.set({})
    state$.data.parts.set({})
    state$.data.sessionStatus.set({})
    state$.lastEvent.set(null)
    state$.isConnected.set(false)
  }, [state$])

  const handleEvent = useCallback(
    (event: Event) => {
      state$.lastEvent.set(event)

      switch (event.type) {
        case 'session.created':
        case 'session.updated': {
          const sessions = state$.data.sessions.peek()
          state$.data.sessions.set({
            ...sessions,
            [event.properties.info.id]: event.properties.info,
          })
          return
        }
        case 'session.deleted': {
          const sessionId = event.properties.info.id

          const sessions = { ...state$.data.sessions.peek() }
          delete sessions[sessionId]
          state$.data.sessions.set(sessions)

          const messages = { ...state$.data.messages.peek() }
          delete messages[sessionId]
          state$.data.messages.set(messages)

          const statuses = { ...state$.data.sessionStatus.peek() }
          delete statuses[sessionId]
          state$.data.sessionStatus.set(statuses)
          return
        }
        case 'session.status': {
          const sessionStatus = state$.data.sessionStatus.peek()
          state$.data.sessionStatus.set({
            ...sessionStatus,
            [event.properties.sessionID]: event.properties.status,
          })
          return
        }
        case 'message.updated': {
          const message = event.properties.info
          const messagesBySession = state$.data.messages.peek()
          const existing = messagesBySession[message.sessionID] ?? []
          const index = existing.findIndex((item) => item.id === message.id)
          const nextMessages =
            index >= 0
              ? existing.map((item, itemIndex) => (itemIndex === index ? message : item))
              : [...existing, message]

          state$.data.messages.set({
            ...messagesBySession,
            [message.sessionID]: nextMessages,
          })
          return
        }
        case 'message.removed': {
          const { sessionID, messageID } = event.properties
          const messagesBySession = state$.data.messages.peek()
          const existing = messagesBySession[sessionID] ?? []
          const nextMessages = existing.filter((item) => item.id !== messageID)

          state$.data.messages.set({
            ...messagesBySession,
            [sessionID]: nextMessages,
          })

          const partsByMessage = { ...state$.data.parts.peek() }
          delete partsByMessage[messageID]
          state$.data.parts.set(partsByMessage)
          return
        }
        case 'message.part.updated': {
          const part = event.properties.part
          const partsByMessage = state$.data.parts.peek()
          const existing = partsByMessage[part.messageID] ?? []
          const index = existing.findIndex((item) => item.id === part.id)
          const nextParts =
            index >= 0
              ? existing.map((item, itemIndex) => (itemIndex === index ? part : item))
              : [...existing, part]

          state$.data.parts.set({
            ...partsByMessage,
            [part.messageID]: nextParts,
          })
          return
        }
        case 'message.part.removed': {
          const { messageID, partID } = event.properties
          const partsByMessage = state$.data.parts.peek()
          const existing = partsByMessage[messageID] ?? []
          const nextParts = existing.filter((item) => item.id !== partID)

          state$.data.parts.set({
            ...partsByMessage,
            [messageID]: nextParts,
          })
          return
        }
        default:
          return
      }
    },
    [state$],
  )

  useEffect(() => {
    if (currentProject) {
      resetData()
      return
    }
    resetData()
  }, [resetData, currentProject])

  useEffect(() => {
    if (!client || !currentProject) {
      return
    }

    const activeClient = client
    const activeProject = currentProject
    let isActive = true

    async function connectStream() {
      if (!isActive) {
        return
      }

      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const response = await activeClient.event.subscribe(
          { directory: activeProject.worktree },
          { signal: controller.signal },
        )

        state$.isConnected.set(true)

        for await (const event of response.stream) {
          if (!isActive) {
            break
          }
          handleEvent(event)
        }

        if (!controller.signal.aborted) {
          state$.isConnected.set(false)
          reconnectTimerRef.current = setTimeout(() => {
            void connectStream()
          }, RECONNECT_DELAY_MS)
        }
      } catch (_error) {
        if (!isActive || controller.signal.aborted) {
          return
        }

        state$.isConnected.set(false)
        reconnectTimerRef.current = setTimeout(() => {
          void connectStream()
        }, RECONNECT_DELAY_MS)
      }
    }

    void connectStream()

    return () => {
      isActive = false
      abortControllerRef.current?.abort()

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }

      state$.isConnected.set(false)
    }
  }, [client, currentProject, handleEvent, state$])

  useEffect(() => {
    if (!client || !currentProject) {
      return
    }

    const activeClient = client
    const activeProject = currentProject

    const loadSessions = async () => {
      const result = await activeClient.session.list({ directory: activeProject.worktree })
      const sessions = result.data ?? []
      const sessionsMap: Record<string, Session> = {}

      for (const session of sessions) {
        sessionsMap[session.id] = session
      }

      state$.data.sessions.set(sessionsMap)
    }

    void loadSessions()
  }, [client, currentProject, state$])

  const syncSession = useCallback(
    async (sessionId: string) => {
      if (!client || !currentProject) {
        return
      }

      const activeClient = client
      const activeProject = currentProject
      const messagesResult = await activeClient.session.messages({
        sessionID: sessionId,
        directory: activeProject.worktree,
      })

      const payload = messagesResult.data ?? []
      const nextMessages = payload.map((entry) => entry.info)
      const messagesBySession = state$.data.messages.peek()

      state$.data.messages.set({
        ...messagesBySession,
        [sessionId]: nextMessages,
      })

      const partsByMessage = { ...state$.data.parts.peek() }
      for (const entry of payload) {
        partsByMessage[entry.info.id] = entry.parts
      }
      state$.data.parts.set(partsByMessage)
    },
    [client, currentProject, state$],
  )

  const getSession = useCallback((id: string) => state$.data.sessions.peek()[id], [state$])
  const listSessions = useCallback(() => Object.values(state$.data.sessions.peek()), [state$])

  const data = useSelector(() => state$.data.get())
  const isConnected = useSelector(() => state$.isConnected.get())
  const lastEvent = useSelector(() => state$.lastEvent.get())

  const value = useMemo<SyncContextValue>(
    () => ({
      data,
      session: {
        get: getSession,
        list: listSessions,
        sync: syncSession,
      },
      isConnected,
      lastEvent,
    }),
    [data, getSession, isConnected, lastEvent, listSessions, syncSession],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSync must be used within SyncProvider')
  }
  return context
}
