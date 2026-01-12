'use client'

import { use$ } from '@legendapp/state/react'
import { Coins, Gauge, Pencil, Square, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DiffPane,
  DiffPaneHeaderActions,
  DiffPaneHeaderContent,
} from '@/components/panes/diff-pane'
import { RevertControls } from '@/components/session/fork-controls'
import { MessageList } from '@/components/session/message-list'
import { SessionInput } from '@/components/session/session-input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { DiffStatsWidget } from '@/components/ui/diff-stats-widget'
import { Input } from '@/components/ui/input'
import { StatusDot } from '@/components/ui/status-dot'
import { usePanes } from '@/context/PanesProvider'
import { useSync } from '@/context/SyncProvider'
import { useModelInfo } from '@/hooks/useModelInfo'
import { useSession } from '@/hooks/useSession'
import { type SessionStats, useSessionStats } from '@/hooks/useSessionStats'
import { useSessionStatus } from '@/hooks/useSessionStatus'
import { sessionService } from '@/lib/opencode/sessions'
import { buildSessionKey, resolveSessionKey } from '@/lib/utils/session-key'
import type { FileDiff } from '@/types'

// Format helpers for compact stats display
function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0'
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

const DEFAULT_CONTEXT_LIMIT = 200_000

// Build hover tooltip content with session stats
function buildTooltipContent(
  stats: SessionStats,
  contextLimit: number | null,
  isSubagent: boolean,
  isFork: boolean,
  parentLabel: string | null,
): string {
  const lines: string[] = []

  if (isSubagent) lines.push('Type: Subagent')
  if (isFork) lines.push('Type: Fork')
  if (parentLabel) lines.push(`Parent: ${parentLabel}`)

  const { tokens } = stats
  const effectiveLimit = contextLimit ?? DEFAULT_CONTEXT_LIMIT
  const contextPercent =
    tokens.currentContext > 0 ? Math.min(100, (tokens.currentContext / effectiveLimit) * 100) : null

  if (contextPercent !== null) {
    lines.push(
      `Context: ${contextPercent.toFixed(0)}% (${formatNumber(tokens.currentContext)} tokens)`,
    )
  }

  if (tokens.cost > 0) {
    lines.push(`Cost: ${formatCost(tokens.cost)}`)
  }

  return lines.join('\n')
}

interface SessionPaneProps {
  sessionKey: string
  autoFocus?: boolean
}

/**
 * Header content component - renders stats in the pane header
 */
export function SessionPaneHeaderContent({ sessionKey }: { sessionKey: string }) {
  const { state$ } = useSync()
  const panes$ = usePanes()
  const { session, messages } = useSession(sessionKey)
  const status = useSessionStatus(sessionKey)
  const sessionStats = useSessionStats(messages)
  const modelInfo = useModelInfo(messages)
  const sessionLookup = useMemo(() => resolveSessionKey(sessionKey), [sessionKey])

  // Subscribe to session diffs for this session
  const sessionDiffs = use$(state$.data.sessionDiffs[sessionKey]) as FileDiff[] | undefined
  const summary = session?.summary

  // Compute diff stats
  const diffStats = useMemo(() => {
    if (sessionDiffs && sessionDiffs.length > 0) {
      return sessionDiffs.reduce(
        (acc, diff) => ({
          additions: acc.additions + diff.additions,
          deletions: acc.deletions + diff.deletions,
        }),
        { additions: 0, deletions: 0 },
      )
    }
    if (!summary) {
      return { additions: 0, deletions: 0 }
    }
    return { additions: summary.additions ?? 0, deletions: summary.deletions ?? 0 }
  }, [sessionDiffs, summary])
  const hasDiffs = diffStats.additions > 0 || diffStats.deletions > 0

  const sessionDepth = (session as { depth?: number } | undefined)?.depth ?? 0
  const parentId = session?.parentID
  const parentSessionKey = useMemo(() => {
    if (!parentId || !sessionLookup) return null
    return buildSessionKey(sessionLookup.directory, parentId)
  }, [parentId, sessionLookup])

  const parentSession = useMemo(() => {
    if (!parentSessionKey) return undefined
    return state$.data.sessions.peek()?.[parentSessionKey]
  }, [parentSessionKey, state$])

  const parentLabel = parentSession?.title?.trim() || parentId || 'Parent'
  const parentTitle = parentSession?.title?.trim() || parentId || 'Session'
  const sessionTitle = session?.title?.trim() || 'Session'
  const isSubagent = Boolean(session && (session.parentID || sessionDepth > 0))
  const isFork = Boolean(session?.parentID && sessionDepth === 0)

  // Handler to open diff pane
  const handleOpenDiff = useCallback(() => {
    panes$.openPane({
      type: 'diff',
      component: <DiffPane sessionKey={sessionKey} />,
      title: `${sessionTitle} - Diff`,
      headerContent: <DiffPaneHeaderContent sessionKey={sessionKey} />,
      headerActions: <DiffPaneHeaderActions sessionKey={sessionKey} />,
    })
  }, [panes$, sessionKey, sessionTitle])

  const handleOpenParent = useCallback(() => {
    if (!parentSessionKey) return
    const paneContent = <SessionPane sessionKey={parentSessionKey} />
    const headerContent = <SessionPaneHeaderContent sessionKey={parentSessionKey} />
    const headerActions = <SessionPaneHeaderActions sessionKey={parentSessionKey} />
    const hasSessionPane = panes$.panes.get().some((pane) => pane.id === 'session')

    if (hasSessionPane) {
      panes$.stackPane('session', paneContent, headerContent, headerActions)
      panes$.setPaneTitle('session', parentTitle)
    } else {
      panes$.openPane({
        type: 'session',
        component: paneContent,
        title: parentTitle,
        headerContent,
        headerActions,
      })
    }
  }, [panes$, parentSessionKey, parentTitle])

  const tooltipContent = buildTooltipContent(
    sessionStats,
    modelInfo.contextLimit,
    isSubagent,
    isFork,
    parentId ? parentLabel : null,
  )

  const effectiveLimit = modelInfo.contextLimit ?? DEFAULT_CONTEXT_LIMIT
  const contextPercent =
    sessionStats.tokens.currentContext > 0
      ? Math.min(100, (sessionStats.tokens.currentContext / effectiveLimit) * 100)
      : null
  const statusType = typeof status === 'string' ? status : (status?.type ?? 'idle')

  return (
    <div
      className="flex items-center gap-2 text-[10px] text-muted-foreground"
      title={tooltipContent}
    >
      {statusType !== 'idle' && <StatusDot status={statusType} size="sm" />}
      {contextPercent !== null && (
        <span className="flex items-center gap-0.5">
          <Gauge className="h-3 w-3" />
          <span className="tabular-nums">{contextPercent.toFixed(0)}%</span>
        </span>
      )}

      {sessionStats.tokens.cost > 0 && (
        <span className="flex items-center gap-0.5">
          <Coins className="h-3 w-3" />
          <span className="tabular-nums">{formatCost(sessionStats.tokens.cost)}</span>
        </span>
      )}
      {hasDiffs && (
        <DiffStatsWidget
          additions={diffStats.additions}
          deletions={diffStats.deletions}
          size="sm"
          onClick={handleOpenDiff}
        />
      )}
      {isSubagent && <span className="rounded bg-secondary/60 px-1 py-0.5">Sub</span>}
      {isFork && <span className="rounded bg-primary/10 px-1 py-0.5 text-primary">Fork</span>}
      {parentId && (
        <button
          type="button"
          onClick={handleOpenParent}
          className="max-w-[80px] truncate text-primary hover:underline"
        >
          ↑ {parentLabel}
        </button>
      )}
    </div>
  )
}

/**
 * Header actions component - renders action buttons in the pane header
 */
export function SessionPaneHeaderActions({ sessionKey }: { sessionKey: string }) {
  const panes$ = usePanes()
  const { session, abort, isWorking } = useSession(sessionKey)
  const sessionLookup = useMemo(() => resolveSessionKey(sessionKey), [sessionKey])
  const title = session?.title?.trim() || 'Session'
  const sessionId = session?.id ?? sessionLookup?.sessionId ?? null

  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [renameTitle, setRenameTitle] = useState(title)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleStop = useCallback(() => void abort(), [abort])

  const handleRenameOpenChange = useCallback(
    (open: boolean) => {
      setIsRenameOpen(open)
      if (open) {
        setRenameTitle(title)
        setRenameError(null)
      }
    },
    [title],
  )

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    setIsDeleteOpen(open)
    if (open) setDeleteError(null)
  }, [])

  const handleRename = useCallback(async () => {
    const nextTitle = renameTitle.trim()
    if (!nextTitle) {
      setRenameError('Title is required')
      return
    }
    if (!sessionId) {
      setRenameError('Session unavailable')
      return
    }

    setIsRenaming(true)
    setRenameError(null)

    try {
      await sessionService.updateTitle(sessionId, nextTitle)
      panes$.setPaneTitle('session', nextTitle)
      setIsRenameOpen(false)
    } catch (error) {
      setRenameError(error instanceof Error ? error.message : 'Failed to rename session')
    } finally {
      setIsRenaming(false)
    }
  }, [panes$, renameTitle, sessionId])

  const handleDelete = useCallback(async () => {
    if (!sessionId) {
      setDeleteError('Session unavailable')
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await sessionService.delete(sessionId)
      setIsDeleteOpen(false)
      panes$.closePane('session')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete session')
    } finally {
      setIsDeleting(false)
    }
  }, [panes$, sessionId])

  return (
    <div className="flex items-center gap-1">
      {isWorking && (
        <Button
          variant="destructive"
          size="sm"
          onPress={handleStop}
          aria-label="Stop session"
          className="h-6 px-2 text-xs"
        >
          <Square className="mr-1 h-3 w-3 fill-current" />
          Stop
        </Button>
      )}
      <RevertControls sessionKey={sessionKey} />
      <Dialog isOpen={isRenameOpen} onOpenChange={handleRenameOpenChange}>
        <Button
          variant="ghost"
          size="icon"
          isDisabled={!sessionId || isRenaming || isDeleting}
          aria-label="Rename"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <DialogContent title="Rename session" description="Update the session title.">
          <DialogBody>
            <div className="space-y-3">
              <Input label="Session title" value={renameTitle} onChange={setRenameTitle} />
              {renameError ? <p className="text-xs text-error">{renameError}</p> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onPress={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onPress={handleRename}
              isDisabled={isRenaming || renameTitle.trim().length === 0}
            >
              {isRenaming ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog isOpen={isDeleteOpen} onOpenChange={handleDeleteOpenChange}>
        <Button
          variant="ghost"
          size="icon"
          isDisabled={!sessionId || isRenaming || isDeleting}
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <DialogContent
          title="Delete session"
          description="This will permanently remove the session and its messages."
        >
          <DialogBody>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              {deleteError ? <p className="text-xs text-error">{deleteError}</p> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onPress={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onPress={handleDelete} isDisabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Session pane content - just messages and input, no header
 * The header is rendered by the Pane wrapper using SessionPaneHeaderContent/Actions
 */
export function SessionPane({ sessionKey, autoFocus }: SessionPaneProps) {
  const { syncSession, syncSessionDiffs, setSessionActive } = useSync()

  useEffect(() => {
    setSessionActive(sessionKey, true)
    void syncSession(sessionKey)
    void syncSessionDiffs(sessionKey)

    return () => {
      setSessionActive(sessionKey, false)
    }
  }, [sessionKey, setSessionActive, syncSession, syncSessionDiffs])

  return (
    <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <MessageList sessionKey={sessionKey} />
      </div>
      <div className="flex-shrink-0 border-t border-border p-3">
        <SessionInput sessionKey={sessionKey} autoFocus={autoFocus} />
      </div>
    </div>
  )
}
