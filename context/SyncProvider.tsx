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
import { getSessionErrorSignature } from '@/lib/opencode/errors'
import { buildSessionKey, parseSessionKey } from '@/lib/utils/session-key'
import { getProjectDirectories } from '@/lib/utils/worktree'
import { useOpenCode } from './OpenCodeProvider'
import { useProject } from './ProjectProvider'

const RECONNECT_DELAY_MS = 5000
const SESSION_LIST_CONCURRENCY = 3

// Session cache settings (tune to trade memory vs preview availability)
const SESSION_CACHE_MAX_SESSIONS = 30
const SESSION_CACHE_TTL_MS = 10 * 60 * 1000
const SESSION_CACHE_SWEEP_INTERVAL_MS = 60 * 1000

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
    /** Tracks which error signatures have been dismissed per session */
    dismissedErrors: Record<string, string>
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

export interface SyncSessionDiffOptions {
  force?: boolean
}

type SessionSummary = NonNullable<Session['summary']>

type SessionCacheEntry = {
  lastAccess: number
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

export const shouldFetchSessionDiffs = ({
  existingDiffs,
  summary,
  force,
}: {
  existingDiffs?: FileDiff[]
  summary?: SessionSummary
  force?: boolean
}): boolean => {
  if (force) {
    return true
  }
  if (existingDiffs !== undefined) {
    return false
  }
  if (!summary) {
    return true
  }
  return summary.files > 0 || summary.additions > 0 || summary.deletions > 0
}

export const selectSessionEvictions = ({
  entries,
  activeSessions,
  maxSessions,
  ttlMs,
  now,
}: {
  entries: Array<[string, SessionCacheEntry]>
  activeSessions: Set<string>
  maxSessions: number
  ttlMs: number
  now: number
}): string[] => {
  const evictions = new Set<string>()

  for (const [key, entry] of entries) {
    if (activeSessions.has(key)) {
      continue
    }
    if (now - entry.lastAccess > ttlMs) {
      evictions.add(key)
    }
  }

  const remainingCount = entries.filter(([key]) => !evictions.has(key)).length
  const overflow = remainingCount - maxSessions

  if (overflow > 0) {
    let remainingOverflow = overflow
    for (const [key] of entries) {
      if (remainingOverflow <= 0) {
        break
      }
      if (activeSessions.has(key) || evictions.has(key)) {
        continue
      }
      evictions.add(key)
      remainingOverflow -= 1
    }
  }

  const ordered: string[] = []
  for (const [key] of entries) {
    if (evictions.has(key)) {
      ordered.push(key)
    }
  }

  return ordered
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

  /** Sync a session's diffs from the server */
  syncSessionDiffs: (sessionKey: string, options?: SyncSessionDiffOptions) => Promise<void>

  /** Pin/unpin a session as active (skips eviction) */
  setSessionActive: (sessionKey: string, isActive: boolean) => void

  /** Get a session without subscribing (peek) */
  getSession: (sessionKey: string) => Session | undefined

  /** List all sessions without subscribing (peek) */
  listSessions: () => Session[]

  /** Dismiss a session error (hides the banner until a new error arrives) */
  dismissSessionError: (sessionKey: string) => void

  /** Check if the current error for a session has been dismissed */
  isSessionErrorDismissed: (sessionKey: string) => boolean
}

const SyncContext = createContext<SyncContextValue | null>(null)

// =============================================================================
// PROVIDER - No subscriptions here, just manages state and exposes it
// =============================================================================
export function SyncProvider({ children }: { children: ReactNode }) {
  const { client } = useOpenCode()
  // Use selectedDirectories from context - it now includes sandboxes/worktrees
  const { currentProject, selectedDirectories } = useProject()
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const sessionCacheRef = useRef<Map<string, SessionCacheEntry>>(new Map())
  const activeSessionKeysRef = useRef<Set<string>>(new Set())

  const isForegroundDirectory = useCallback(
    (directory: string | undefined) => {
      if (!directory) {
        return true
      }
      if (!selectedDirectories) {
        return true // null means show all
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
      dismissedErrors: {},
      needsHydration: {},
    },
    isConnected: false,
    lastEvent: null,
  })

  // Helper to access observable keys - Legend State always returns an observable for key access
  // This is a pure utility function, not a hook or stateful value
  // biome-ignore lint/suspicious/noExplicitAny: Legend State proxy returns observable for any key
  const key$ = <T,>(obs: any, k: string): Observable<T> => obs[k]

  // biome-ignore lint/correctness/useExhaustiveDependencies: key$ is a pure utility function
  const clearSessionData = useCallback(
    (sessionKey: string) => {
      const messages = key$<Message[]>(state$.data.messages, sessionKey).peek() ?? []

      batch(() => {
        key$<Message[]>(state$.data.messages, sessionKey).delete()
        key$<FileDiff[]>(state$.data.sessionDiffs, sessionKey).delete()
        for (const message of messages) {
          key$<Part[]>(state$.data.parts, message.id).delete()
        }
        key$<boolean>(state$.data.needsHydration, sessionKey).set(true)
      })
    },
    [state$],
  )

  const evictSessions = useCallback(
    (now: number) => {
      const entries = Array.from(sessionCacheRef.current.entries())
      const evictedKeys = selectSessionEvictions({
        entries,
        activeSessions: activeSessionKeysRef.current,
        maxSessions: SESSION_CACHE_MAX_SESSIONS,
        ttlMs: SESSION_CACHE_TTL_MS,
        now,
      })

      if (evictedKeys.length === 0) {
        return
      }

      for (const sessionKey of evictedKeys) {
        sessionCacheRef.current.delete(sessionKey)
        clearSessionData(sessionKey)
      }
    },
    [clearSessionData],
  )

  const touchSessionCache = useCallback(
    (sessionKey: string, now = Date.now()) => {
      const cache = sessionCacheRef.current
      if (cache.has(sessionKey)) {
        cache.delete(sessionKey)
      }
      cache.set(sessionKey, { lastAccess: now })
      evictSessions(now)
    },
    [evictSessions],
  )

  const setSessionActive = useCallback((sessionKey: string, isActive: boolean) => {
    if (!sessionKey) {
      return
    }
    if (isActive) {
      activeSessionKeysRef.current.add(sessionKey)
      return
    }
    activeSessionKeysRef.current.delete(sessionKey)
  }, [])

  const resetData = useCallback(() => {
    sessionCacheRef.current.clear()
    activeSessionKeysRef.current.clear()
    batch(() => {
      state$.data.sessions.set({})
      state$.data.messages.set({})
      state$.data.parts.set({})
      state$.data.sessionStatus.set({})
      state$.data.permissions.set({})
      state$.data.todos.set({})
      state$.data.sessionDiffs.set({})
      state$.data.sessionErrors.set({})
      state$.data.dismissedErrors.set({})
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
            key$<string>(state$.data.dismissedErrors, sessionKey).delete()
            key$<boolean>(state$.data.needsHydration, sessionKey).delete()
          })

          activeSessionKeysRef.current.delete(sessionKey)
          sessionCacheRef.current.delete(sessionKey)
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
          const sessionKey = sessionKeyFor(sessionID)
          // O(1) key-based update
          key$<FileDiff[]>(state$.data.sessionDiffs, sessionKey).set(diff)
          touchSessionCache(sessionKey)
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
          touchSessionCache(sessionKey)
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

          touchSessionCache(sessionKey)
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
    [isForegroundDirectory, markNeedsHydration, state$, touchSessionCache],
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
        // Filter out junk/temporary projects
        const validProjects = allProjects.filter((p) => p.worktree && !isJunkProject(p.worktree))

        // Build list of ALL directories to fetch sessions from (worktree + sandboxes)
        // Deduplicate in case same directory appears in multiple projects
        const allDirectories: Array<{ directory: string; project: (typeof validProjects)[0] }> = []
        const seenDirectories = new Set<string>()

        for (const project of validProjects) {
          // Get all directories for this project (worktree + sandboxes)
          const directories = getProjectDirectories(project)
          for (const directory of directories) {
            // Skip junk directories and duplicates
            if (!isJunkProject(directory) && !seenDirectories.has(directory)) {
              seenDirectories.add(directory)
              allDirectories.push({ directory, project })
            }
          }
        }

        const sessionsMap: Record<string, Session> = {}

        let nextIndex = 0
        const workerCount = Math.min(SESSION_LIST_CONCURRENCY, allDirectories.length)
        const workers = Array.from({ length: workerCount }, async () => {
          while (nextIndex < allDirectories.length) {
            const item = allDirectories[nextIndex]
            nextIndex += 1
            if (signal?.aborted) {
              return
            }
            if (!item) {
              continue
            }

            const result = await activeClient.session.list({ directory: item.directory })
            const sessions = result.data ?? []
            for (const session of sessions) {
              // Use session.directory if available, otherwise fall back to the directory we queried
              const sessionDir = session.directory || item.directory
              sessionsMap[buildSessionKey(sessionDir, session.id)] = session
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

  useEffect(() => {
    const interval = setInterval(() => {
      evictSessions(Date.now())
    }, SESSION_CACHE_SWEEP_INTERVAL_MS)

    return () => {
      clearInterval(interval)
    }
  }, [evictSessions])

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
      const hasCachedMessages = Boolean(existingMessages && existingMessages.length > 0)

      if (
        !shouldFetchSessionMessages({ existingMessages, needsHydration, force: options?.force })
      ) {
        if (hasCachedMessages) {
          touchSessionCache(normalizedKey)
        }
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

      touchSessionCache(normalizedKey)
    },
    [client, currentProject, state$, touchSessionCache],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: key$ is a pure utility function
  const syncSessionDiffs = useCallback(
    async (sessionKey: string, options?: SyncSessionDiffOptions) => {
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
      const existingDiffs = key$<FileDiff[]>(state$.data.sessionDiffs, normalizedKey).peek()
      const session = key$<Session>(state$.data.sessions, normalizedKey).peek()
      const summary = session?.summary
      const summaryHasDiffs = Boolean(
        summary && (summary.files > 0 || summary.additions > 0 || summary.deletions > 0),
      )

      if (!shouldFetchSessionDiffs({ existingDiffs, summary, force: options?.force })) {
        if (existingDiffs === undefined && summary && !summaryHasDiffs) {
          key$<FileDiff[]>(state$.data.sessionDiffs, normalizedKey).set([])
          touchSessionCache(normalizedKey)
        } else if (existingDiffs !== undefined) {
          touchSessionCache(normalizedKey)
        }
        return
      }

      const activeClient = client
      const diffResult = await activeClient.session.diff({
        sessionID: sessionId,
        directory,
      })
      const diffs = diffResult.data ?? []
      key$<FileDiff[]>(state$.data.sessionDiffs, normalizedKey).set(diffs)
      touchSessionCache(normalizedKey)
    },
    [client, currentProject, state$, touchSessionCache],
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

  // Stable method - dismiss a session error
  // biome-ignore lint/correctness/useExhaustiveDependencies: key$ is a pure utility function
  const dismissSessionError = useCallback(
    (sessionKey: string) => {
      const error = key$<{ name: string; data: Record<string, unknown> }>(
        state$.data.sessionErrors,
        sessionKey,
      ).peek()
      if (!error) {
        return
      }
      const signature = getSessionErrorSignature(error)
      if (signature) {
        key$<string>(state$.data.dismissedErrors, sessionKey).set(signature)
      }
    },
    [state$],
  )

  // Stable method - check if current error is dismissed
  // biome-ignore lint/correctness/useExhaustiveDependencies: key$ is a pure utility function
  const isSessionErrorDismissed = useCallback(
    (sessionKey: string): boolean => {
      const error = key$<{ name: string; data: Record<string, unknown> }>(
        state$.data.sessionErrors,
        sessionKey,
      ).peek()
      if (!error) {
        return false
      }
      const signature = getSessionErrorSignature(error)
      const dismissedSignature = key$<string>(state$.data.dismissedErrors, sessionKey).peek()
      return signature === dismissedSignature
    },
    [state$],
  )

  // ==========================================================================
  // CRITICAL: Context value is created ONCE and NEVER changes
  // Components subscribe directly to state$ for reactivity
  // ==========================================================================
  const value = useMemo<SyncContextValue>(
    () => ({
      state$,
      syncSession,
      syncSessionDiffs,
      setSessionActive,
      getSession,
      listSessions,
      dismissSessionError,
      isSessionErrorDismissed,
    }),
    // These are stable refs - state$ from useObservable, callbacks from useCallback
    [
      state$,
      syncSession,
      syncSessionDiffs,
      setSessionActive,
      getSession,
      listSessions,
      dismissSessionError,
      isSessionErrorDismissed,
    ],
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
