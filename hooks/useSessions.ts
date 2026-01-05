'use client'

import type { Observable } from '@legendapp/state'
import { use$ } from '@legendapp/state/react'
import { useCallback, useMemo } from 'react'
import { useProject } from '@/context/ProjectProvider'
import { useSync } from '@/context/SyncProvider'
import type { Session } from '@/lib/opencode'
import { sessionService } from '@/lib/opencode/sessions'
import { parseSessionKey } from '@/lib/utils/session-key'

export type SessionSubscription = 'structure' | 'list'

export interface UseSessionsOptions {
  parentId?: string
  depth?: number
  includeArchived?: boolean
  subscription?: SessionSubscription
}

type SessionWithDepth = Session & {
  depth?: number
  sessionKey: string
}

type SessionObservable = Observable<SessionWithDepth>

const getDepth = (session: SessionWithDepth) => session.depth ?? 0

const sortByUpdatedDesc = (a: SessionWithDepth, b: SessionWithDepth) =>
  b.time.updated - a.time.updated

export function useSessions(options?: UseSessionsOptions) {
  const { state$ } = useSync()
  const { projects, selectedProjectIds } = useProject()

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

  const matchesSelectedProjects = useCallback(
    (session: SessionWithDepth) => {
      if (!selectedDirectories) {
        return true
      }
      const directory = parseSessionKey(session.sessionKey)?.directory ?? session.directory
      return Boolean(directory && selectedDirectories.has(directory))
    },
    [selectedDirectories],
  )

  const subscription = options?.subscription ?? 'list'

  // Subscribe only to the fields we need (avoid global record subscriptions)
  const sessionSlices = use$(() => {
    const keys = Object.keys(state$.data.sessions as unknown as Record<string, unknown>)
    return keys.map((sessionKey) => {
      const session$ = state$.data.sessions[sessionKey] as SessionObservable
      const parentID = session$.parentID.get()
      const depth = session$.depth.get()
      const archived = session$.time.archived.get()
      const directory = session$.directory.get()

      if (subscription === 'structure') {
        return { sessionKey, parentID, depth, archived, directory }
      }

      const updated = session$.time.updated.get()
      const created = session$.time.created.get()
      const title = session$.title.get()

      return {
        sessionKey,
        parentID,
        depth,
        archived,
        directory,
        updated,
        created,
        title,
      }
    })
  })

  // Transform to array with sessionKey (peek avoids global subscription)
  const allSessions = useMemo((): SessionWithDepth[] => {
    if (sessionSlices.length === 0) return []
    const sessionsRecord = state$.data.sessions.peek() ?? {}
    return sessionSlices
      .map(({ sessionKey }) => {
        const session = sessionsRecord[sessionKey]
        if (!session) return null
        return {
          ...session,
          sessionKey,
        }
      })
      .filter(Boolean) as SessionWithDepth[]
  }, [sessionSlices, state$])

  const parentSessionId = useMemo(() => {
    if (options?.parentId === undefined) {
      return undefined
    }
    const parsed = parseSessionKey(options.parentId)
    return parsed?.sessionId ?? options.parentId
  }, [options?.parentId])

  const sessions = useMemo(() => {
    let filtered = allSessions

    if (parentSessionId !== undefined) {
      filtered = filtered.filter((session) => session.parentID === parentSessionId)
    }

    if (selectedDirectories) {
      filtered = filtered.filter(matchesSelectedProjects)
    }

    if (options?.depth !== undefined) {
      filtered = filtered.filter((session) => getDepth(session) === options.depth)
    }

    if (!options?.includeArchived) {
      filtered = filtered.filter((session) => !session.time.archived)
    }

    return [...filtered].sort(sortByUpdatedDesc)
  }, [
    allSessions,
    matchesSelectedProjects,
    options?.depth,
    options?.includeArchived,
    parentSessionId,
    selectedDirectories,
  ])

  const rootSessions = useMemo(() => {
    let filtered = allSessions

    if (selectedDirectories) {
      filtered = filtered.filter(matchesSelectedProjects)
    }

    return filtered
      .filter((session) => !session.parentID && getDepth(session) === 0)
      .filter((session) => !session.time.archived)
      .sort(sortByUpdatedDesc)
  }, [allSessions, matchesSelectedProjects, selectedDirectories])

  const create = useCallback(async () => sessionService.create(), [])

  const getSubagentSessions = useCallback(
    (parentId: string) => {
      const parsed = parseSessionKey(parentId)
      const parentSessionId = parsed?.sessionId ?? parentId

      return allSessions
        .filter((session) => session.parentID === parentSessionId)
        .filter((session) => matchesSelectedProjects(session))
        .sort((a, b) => getDepth(a) - getDepth(b))
    },
    [allSessions, matchesSelectedProjects],
  )

  return {
    sessions,
    rootSessions,
    create,
    getSubagentSessions,
  }
}
