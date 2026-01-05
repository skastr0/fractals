'use client'

import type { Observable } from '@legendapp/state'
import { batch } from '@legendapp/state'
import { useObservable } from '@legendapp/state/react'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import type { Event, GlobalEvent, Message, Part, Session, SessionStatus } from '@/lib/opencode'
import { buildSessionKey, parseSessionKey } from '@/lib/utils/session-key'
import { useOpenCode } from './OpenCodeProvider'
import { useProject } from './ProjectProvider'

const RECONNECT_DELAY_MS = 5000
const SESSION_LIST_CONCURRENCY = 3

// Filter out temporary/sandbox directories - same as ProjectProvider
const EXCLUDE_PATTERNS = [
  /\/private\/var\//,
  /\/var\/folders\//,
  /^\/tmp\//,
  /^C:\\Users\\[^\\]+\\AppData\\Local\\Temp/i,
]

const isJunkProject = (worktree: string): boolean => {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(worktree))
}

const BACKGROUND_EVENT_ALLOWLIST = new Set([
  'session.created',
  'session.updated',
  'session.deleted',
  'session.status',
  'session.error',
])

// Permission type from SDK
interface Permission {
  id: string
  type: string
  pattern?: string | string[]
  sessionID: string
  messageID: string
  callID?: string
  title: string
  metadata: Record<string, unknown>
  time: { created: number }
}

// Todo type from SDK
interface Todo {
  id: string
  content: string
  status: string
  priority: string
}

// FileDiff type from SDK
interface FileDiff {
  file: string
  before: string
  after: string
  additions: number
  deletions: number
}

const getHydrationSessionId = (event: Event): string | null => {
  switch (event.type) {
    case 'session.created':
    case 'session.updated':
    case 'session.deleted':
      return event.properties.info.id
    case 'session.status':
    case 'session.error':
    case 'session.diff':
      return event.properties.sessionID ?? null
    case 'message.updated':
      return event.properties.info.sessionID
    case 'message.removed':
      return event.properties.sessionID ?? null
    case 'message.part.updated': {
      const part = event.properties.part as Part & { sessionID?: string }
      return part.sessionID ?? null
    }
    case 'permission.updated': {
      const permission = event.properties as Permission
      return permission.sessionID
    }
    case 'permission.replied':
      return event.properties.sessionID ?? null
    case 'todo.updated':
      return event.properties.sessionID ?? null
    default:
      return null
  }
}

// =============================================================================
// STATE SHAPE - The observable structure
// =============================================================================
export interface SyncState {
  data: {
    sessions: Record<string, Session>
    messages: Record<string, Message[]>
    parts: Record<string, Part[]>
    sessionStatus: Record<string, SessionStatus>
    permissions: Record<string, Permission[]>
    todos: Record<string, Todo[]>
    sessionDiffs: Record<string, FileDiff[]>
    sessionErrors: Record<string, { name: string; data: Record<string, unknown> }>
    needsHydration: Record<string, boolean>
  }
  isConnected: boolean
  lastEvent: Event | null
}

// =============================================================================
// CONTEXT VALUE - Stable reference, NEVER changes after mount
// =============================================================================
export interface SyncSessionOptions {
  force?: boolean
}

export const shouldFetchSessionMessages = ({
  existingMessages,
  needsHydration,
  force,
}: {
  existingMessages?: Message[]
  needsHydration?: boolean
  force?: boolean
}): boolean => {
  const hasMessages = Boolean(existingMessages && existingMessages.length > 0)
  return Boolean(force) || !hasMessages || Boolean(needsHydration)
}

export interface SyncContextValue {
  /**
   * The observable state. Use with Legend State's use$ for fine-grained subscriptions.
   *
   * Example - subscribe to sessions only:
   *   const sessions = use$(() => sync.state$.data.sessions.get())
   *
   * Example - subscribe to ONE session's messages:
   *   const messages = use$(() => sync.state$.data.messages[sessionKey].get())
   */
  state$: Observable<SyncState>

  /** Sync a session's messages from the server */
  syncSession: (sessionKey: string, options?: SyncSessionOptions) => Promise<void>

  /** Get a session without subscribing (peek) */
  getSession: (sessionKey: string) => Session | undefined

  /** List all sessions without subscribing (peek) */
  listSessions: () => Session[]
}

const SyncContext = createContext<SyncContextValue | null>(null)

// =============================================================================
// PROVIDER - No subscriptions here, just manages state and exposes it
// =============================================================================
export function SyncProvider({ children }: { children: ReactNode }) {
  const { client } = useOpenCode()
  const { currentProject, projects, selectedProjectIds } = useProject()
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const selectedDirectories = useMemo(() => {
    if (selectedProjectIds.length === 0) {
      return null
    }
    const directories = new Set<string>()
    for (const projectId of selectedProjectIds) {
      const project = projects.find((item) => item.id === projectId)
      if (project?.worktree) {
        directories.add(project.worktree)
      }
    }
    return directories
  }, [projects, selectedProjectIds])

  const isForegroundDirectory = useCallback(
    (directory: string | undefined) => {
      if (!directory) {
        return true
      }
      if (!selectedDirectories) {
        return true
      }
      return selectedDirectories.has(directory)
    },
    [selectedDirectories],
  )

  // The observable state - this is the single source of truth
  const state$ = useObservable<SyncState>({
    data: {
      sessions: {},
      messages: {},
      parts: {},
      sessionStatus: {},
      permissions: {},
      todos: {},
      sessionDiffs: {},
      sessionErrors: {},
      needsHydration: {},
    },
    isConnected: false,
    lastEvent: null,
  })

  // Helper to access observable keys - Legend State always returns an observable for key access
  // This is a pure utility function, not a hook or stateful value
  // biome-ignore lint/suspicious/noExplicitAny: Legend State proxy returns observable for any key
  const key$ = <T,>(obs: any, k: string): Observable<T> => obs[k]

  const resetData = useCallback(() => {
    batch(() => {
      state$.data.sessions.set({})
      state$.data.messages.set({})
      state$.data.parts.set({})
      state$.data.sessionStatus.set({})
      state$.data.permissions.set({})
      state$.data.todos.set({})
      state$.data.sessionDiffs.set({})
      state$.data.sessionErrors.set({})
      state$.data.needsHydration.set({})
      state$.lastEvent.set(null)
      state$.isConnected.set(false)
    })
  }, [state$])

  // biome-ignore lint/correctness/useExhaustiveDependencies: key$ is a pure utility function
  const markNeedsHydration = useCallback(
    (event: Event, directory: string) => {
      const sessionId = getHydrationSessionId(event)
      if (!sessionId) {
        return
      }
      const sessionKey = buildSessionKey(directory, sessionId)
      if (key$<boolean>(state$.data.needsHydration, sessionKey).peek()) {
        return
      }
      // O(1) key-based update
      key$<boolean>(state$.data.needsHydration, sessionKey).set(true)
    },
    [state$],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: key$ is a pure utility function
  const handleEvent = useCallback(
    (event: Event, directory: string) => {
      state$.lastEvent.set(event)
      if (!directory) {
        return
      }

      const isForeground = isForegroundDirectory(directory)
      if (!isForeground && !BACKGROUND_EVENT_ALLOWLIST.has(event.type)) {
        markNeedsHydration(event, directory)
        return
      }

      const sessionKeyFor = (sessionId: string) => buildSessionKey(directory, sessionId)

      switch (event.type) {
        case 'session.created':
        case 'session.updated': {
          // O(1) key-based update
          key$<Session>(state$.data.sessions, sessionKeyFor(event.properties.info.id)).set(
            event.properties.info,
          )
          return
        }
        case 'session.deleted': {
          const sessionKey = sessionKeyFor(event.properties.info.id)

          // O(1) key-based deletes
          batch(() => {
            key$<Session>(state$.data.sessions, sessionKey).delete()
            key$<Message[]>(state$.data.messages, sessionKey).delete()
            key$<SessionStatus>(state$.data.sessionStatus, sessionKey).delete()
            key$<Permission[]>(state$.data.permissions, sessionKey).delete()
            key$<Todo[]>(state$.data.todos, sessionKey).delete()
            key$<FileDiff[]>(state$.data.sessionDiffs, sessionKey).delete()
            key$<{ name: string; data: Record<string, unknown> }>(
              state$.data.sessionErrors,
              sessionKey,
            ).delete()
            key$<boolean>(state$.data.needsHydration, sessionKey).delete()
          })
          return
        }
        case 'session.status': {
          // O(1) key-based update
          key$<SessionStatus>(
            state$.data.sessionStatus,
            sessionKeyFor(event.properties.sessionID),
          ).set(event.properties.status)
          return
        }
        case 'session.error': {
          const { sessionID, error } = event.properties
          if (sessionID && error) {
            // O(1) key-based update
            key$<{ name: string; data: Record<string, unknown> }>(
              state$.data.sessionErrors,
              sessionKeyFor(sessionID),
            ).set(error as { name: string; data: Record<string, unknown> })
          }
          return
        }
        case 'session.diff': {
          const { sessionID, diff } = event.properties
          // O(1) key-based update
          key$<FileDiff[]>(state$.data.sessionDiffs, sessionKeyFor(sessionID)).set(diff)
          return
        }
        case 'message.updated': {
          const message = event.properties.info
          const sessionKey = sessionKeyFor(message.sessionID)
          const existing = key$<Message[]>(state$.data.messages, sessionKey).peek() ?? []
          const index = existing.findIndex((item) => item.id === message.id)
          const nextMessages =
            index >= 0
              ? existing.map((item, itemIndex) => (itemIndex === index ? message : item))
              : [...existing, message]

          // O(1) key-based update
          key$<Message[]>(state$.data.messages, sessionKey).set(nextMessages)
          return
        }
        case 'message.removed': {
          const { sessionID, messageID } = event.properties
          const sessionKey = sessionKeyFor(sessionID)

          batch(() => {
            const existing = key$<Message[]>(state$.data.messages, sessionKey).peek() ?? []
            const nextMessages = existing.filter((item) => item.id !== messageID)
            // O(1) key-based updates
            key$<Message[]>(state$.data.messages, sessionKey).set(nextMessages)
            key$<Part[]>(state$.data.parts, messageID).delete()
          })
          return
        }
        case 'message.part.updated': {
          const part = event.properties.part
          const existing = key$<Part[]>(state$.data.parts, part.messageID).peek() ?? []
          const index = existing.findIndex((item) => item.id === part.id)
          const nextParts =
            index >= 0
              ? existing.map((item, itemIndex) => (itemIndex === index ? part : item))
              : [...existing, part]

          // O(1) key-based update
          key$<Part[]>(state$.data.parts, part.messageID).set(nextParts)
          return
        }
        case 'message.part.removed': {
          const { messageID, partID } = event.properties
          const existing = key$<Part[]>(state$.data.parts, messageID).peek() ?? []
          const nextParts = existing.filter((item) => item.id !== partID)

          // O(1) key-based update
          key$<Part[]>(state$.data.parts, messageID).set(nextParts)
          return
        }
        case 'permission.updated': {
          const permission = event.properties as Permission
          const sessionKey = sessionKeyFor(permission.sessionID)
          const existing = key$<Permission[]>(state$.data.permissions, sessionKey).peek() ?? []
          const index = existing.findIndex((p) => p.id === permission.id)
          const nextPermissions =
            index >= 0
              ? existing.map((p, i) => (i === index ? permission : p))
              : [...existing, permission]

          // O(1) key-based update
          key$<Permission[]>(state$.data.permissions, sessionKey).set(nextPermissions)
          return
        }
        case 'permission.replied': {
          const { sessionID, permissionID } = event.properties
          const sessionKey = sessionKeyFor(sessionID)
          const existing = key$<Permission[]>(state$.data.permissions, sessionKey).peek() ?? []
          const nextPermissions = existing.filter((p) => p.id !== permissionID)

          // O(1) key-based update
          key$<Permission[]>(state$.data.permissions, sessionKey).set(nextPermissions)
          return
        }
        case 'todo.updated': {
          const { sessionID, todos } = event.properties
          // O(1) key-based update
          key$<Todo[]>(state$.data.todos, sessionKeyFor(sessionID)).set(todos)
          return
        }
        default:
          return
      }
    },
    [isForegroundDirectory, markNeedsHydration, state$],
  )

  const handleGlobalEvent = useCallback(
    (event: GlobalEvent) => {
      handleEvent(event.payload, event.directory)
    },
    [handleEvent],
  )

  const hydrateSessions = useCallback(
    async (activeClient: typeof client, signal?: AbortSignal) => {
      if (!activeClient) {
        return
      }

      try {
        const projectsResult = await activeClient.project.list()
        const allProjects = projectsResult.data ?? []
        // Filter out junk/temporary projects to avoid loading hundreds of sandbox sessions
        const validProjects = allProjects.filter((p) => p.worktree && !isJunkProject(p.worktree))
        const sessionsMap: Record<string, Session> = {}

        let nextIndex = 0
        const workerCount = Math.min(SESSION_LIST_CONCURRENCY, validProjects.length)
        const workers = Array.from({ length: workerCount }, async () => {
          while (nextIndex < validProjects.length) {
            const project = validProjects[nextIndex]
            nextIndex += 1
            if (signal?.aborted) {
              return
            }
            if (!project) {
              continue
            }

            const result = await activeClient.session.list({ directory: project.worktree })
            const sessions = result.data ?? []
            for (const session of sessions) {
              sessionsMap[buildSessionKey(project.worktree, session.id)] = session
            }
          }
        })

        await Promise.all(workers)

        if (signal?.aborted) {
          return
        }

        state$.data.sessions.set(sessionsMap)
      } catch {
        return
      }
    },
    [state$],
  )

  useEffect(() => {
    if (!client) {
      resetData()
      return
    }
    resetData()
  }, [client, resetData])

  useEffect(() => {
    if (!client) {
      return
    }

    const activeClient = client
    let isActive = true

    async function connectStream() {
      if (!isActive) {
        return
      }

      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const response = await activeClient.global.event({ signal: controller.signal })

        state$.isConnected.set(true)
        void hydrateSessions(activeClient, controller.signal)

        for await (const event of response.stream) {
          if (!isActive) {
            break
          }
          handleGlobalEvent(event)
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
  }, [client, handleGlobalEvent, hydrateSessions, state$])

  // Stable method - syncs a session's messages from server
  // biome-ignore lint/correctness/useExhaustiveDependencies: key$ is a pure utility function
  const syncSession = useCallback(
    async (sessionKey: string, options?: SyncSessionOptions) => {
      if (!client) {
        return
      }

      const parsed = parseSessionKey(sessionKey)
      const directory = parsed?.directory ?? currentProject?.worktree
      const sessionId = parsed?.sessionId ?? sessionKey
      if (!directory) {
        return
      }

      const normalizedKey = parsed ? sessionKey : buildSessionKey(directory, sessionId)
      const existingMessages = key$<Message[]>(state$.data.messages, normalizedKey).peek()
      const needsHydration = key$<boolean>(state$.data.needsHydration, normalizedKey).peek()

      if (
        !shouldFetchSessionMessages({ existingMessages, needsHydration, force: options?.force })
      ) {
        return
      }

      const activeClient = client

      const messagesResult = await activeClient.session.messages({
        sessionID: sessionId,
        directory,
      })

      const payload = messagesResult.data ?? []

      const nextMessages = payload.map((entry) => entry.info)

      batch(() => {
        // Set ONLY this session's messages - no spreading
        key$<Message[]>(state$.data.messages, normalizedKey).set(nextMessages)

        // Set ONLY these message parts - no spreading
        for (const entry of payload) {
          key$<Part[]>(state$.data.parts, entry.info.id).set(entry.parts)
        }

        // Clear hydration flag if set
        if (key$<boolean>(state$.data.needsHydration, normalizedKey).peek()) {
          key$<boolean>(state$.data.needsHydration, normalizedKey).delete()
        }
      })
    },
    [client, currentProject, state$],
  )

  // Stable method - get a session without subscribing
  const getSession = useCallback(
    (sessionKey: string) => {
      const parsed = parseSessionKey(sessionKey)
      const normalizedKey = parsed
        ? sessionKey
        : currentProject
          ? buildSessionKey(currentProject.worktree, sessionKey)
          : sessionKey
      return state$.data.sessions.peek()?.[normalizedKey]
    },
    [currentProject, state$],
  )

  // Stable method - list all sessions without subscribing
  const listSessions = useCallback(() => Object.values(state$.data.sessions.peek() ?? {}), [state$])

  // ==========================================================================
  // CRITICAL: Context value is created ONCE and NEVER changes
  // Components subscribe directly to state$ for reactivity
  // ==========================================================================
  const value = useMemo<SyncContextValue>(
    () => ({
      state$,
      syncSession,
      getSession,
      listSessions,
    }),
    // These are stable refs - state$ from useObservable, callbacks from useCallback
    [state$, syncSession, getSession, listSessions],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

// =============================================================================
// HOOKS - For consuming the sync state
// =============================================================================

/**
 * Access the sync context. Returns stable references that never change.
 * Use state$ with use$ for reactive data.
 */
export function useSync(): SyncContextValue {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSync must be used within SyncProvider')
  }
  return context
}
