'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { RevertControls } from '@/components/session/fork-controls'
import { MessageList } from '@/components/session/message-list'
import { SessionInput } from '@/components/session/session-input'
import { SessionStatusBadge } from '@/components/ui/session-status-badge'
import { usePanes } from '@/context/PanesProvider'
import { useSync } from '@/context/SyncProvider'
import { useSession } from '@/hooks/useSession'
import { useSessionStatus } from '@/hooks/useSessionStatus'
import { formatRelativeTime } from '@/lib/utils/date'
import { buildSessionKey, resolveSessionKey } from '@/lib/utils/session-key'

interface SessionPaneProps {
  sessionKey: string
  autoFocus?: boolean
}

export function SessionPane({ sessionKey, autoFocus }: SessionPaneProps) {
  const { state$, syncSession } = useSync()
  const panes$ = usePanes()
  const { session } = useSession(sessionKey)
  const status = useSessionStatus(sessionKey)
  const sessionLookup = useMemo(() => resolveSessionKey(sessionKey), [sessionKey])
  const title = session?.title?.trim() || 'Session'
  const updatedAt = session?.time.updated ?? Date.now()
  const sessionDepth = (session as { depth?: number } | undefined)?.depth ?? 0
  const parentId = session?.parentID
  const parentSessionKey = useMemo(() => {
    if (!parentId || !sessionLookup) {
      return null
    }
    return buildSessionKey(sessionLookup.directory, parentId)
  }, [parentId, sessionLookup])

  // Use peek() to read parent session without subscribing
  const parentSession = useMemo(() => {
    if (!parentSessionKey) return undefined
    return state$.data.sessions.peek()?.[parentSessionKey]
  }, [parentSessionKey, state$])

  const parentLabel = parentSession?.title?.trim() || parentId || 'Parent'
  const parentTitle = parentSession?.title?.trim() || parentId || 'Session'
  const isSubagent = Boolean(session && (session.parentID || sessionDepth > 0))
  const isFork = Boolean(session?.parentID && sessionDepth === 0)

  const handleOpenParent = useCallback(() => {
    if (!parentSessionKey) {
      return
    }

    const paneContent = <SessionPane sessionKey={parentSessionKey} />
    const hasSessionPane = panes$.panes.get().some((pane) => pane.id === 'session')

    if (hasSessionPane) {
      panes$.stackPane('session', paneContent)
      panes$.setPaneTitle('session', parentTitle)
    } else {
      panes$.openPane({ type: 'session', component: paneContent, title: parentTitle })
    }
  }, [panes$, parentSessionKey, parentTitle])

  useEffect(() => {
    void syncSession(sessionKey)
  }, [sessionKey, syncSession])

  return (
    <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{title}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{formatRelativeTime(updatedAt)}</span>
            {isSubagent ? (
              <span className="rounded bg-secondary/60 px-1.5 py-0.5 text-[10px]">Subagent</span>
            ) : null}
            {isFork ? (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                Fork
              </span>
            ) : null}
            {parentId ? (
              <button
                type="button"
                onClick={handleOpenParent}
                className="max-w-[200px] truncate text-xs text-primary hover:underline"
                title={`Open parent session: ${parentLabel}`}
              >
                Parent: {parentLabel}
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SessionStatusBadge status={status} />
          <RevertControls sessionKey={sessionKey} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <MessageList sessionKey={sessionKey} />
      </div>
      <div className="flex-shrink-0 border-t border-border p-4">
        <SessionInput sessionKey={sessionKey} autoFocus={autoFocus} />
      </div>
    </div>
  )
}
