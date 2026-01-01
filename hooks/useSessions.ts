'use client'

import { useCallback, useMemo } from 'react'
import { useSync } from '@/context/SyncProvider'
import type { Session } from '@/lib/opencode'
import { sessionService } from '@/lib/opencode/sessions'

export interface UseSessionsOptions {
  parentId?: string
  depth?: number
  includeArchived?: boolean
}

type SessionWithDepth = Session & {
  depth?: number
}

const getDepth = (session: SessionWithDepth) => session.depth ?? 0

const sortByUpdatedDesc = (a: SessionWithDepth, b: SessionWithDepth) =>
  b.time.updated - a.time.updated

export function useSessions(options?: UseSessionsOptions) {
  const sync = useSync()

  const allSessions = useMemo(
    () => Object.values(sync.data.sessions) as SessionWithDepth[],
    [sync.data.sessions],
  )

  const sessions = useMemo(() => {
    let filtered = allSessions

    if (options?.parentId !== undefined) {
      filtered = filtered.filter((session) => session.parentID === options.parentId)
    }

    if (options?.depth !== undefined) {
      filtered = filtered.filter((session) => getDepth(session) === options.depth)
    }

    if (!options?.includeArchived) {
      filtered = filtered.filter((session) => !session.time.archived)
    }

    return [...filtered].sort(sortByUpdatedDesc)
  }, [allSessions, options?.depth, options?.includeArchived, options?.parentId])

  const rootSessions = useMemo(() => {
    return allSessions
      .filter((session) => !session.parentID && getDepth(session) === 0)
      .filter((session) => !session.time.archived)
      .sort(sortByUpdatedDesc)
  }, [allSessions])

  const create = useCallback(async () => sessionService.create(), [])

  const getSubagentSessions = useCallback(
    (parentId: string) => {
      return allSessions
        .filter((session) => session.parentID === parentId)
        .sort((a, b) => getDepth(a) - getDepth(b))
    },
    [allSessions],
  )

  return {
    sessions,
    rootSessions,
    create,
    getSubagentSessions,
  }
}
