'use client'

import { use$ } from '@legendapp/state/react'
import { Check, ChevronDown, ChevronRight, Copy, FileCode, Minus, Plus } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { PierreDiffView } from '@/components/ui/pierre-diff-view'
import { useSync } from '@/context/SyncProvider'
import { cn, formatUnifiedDiff, formatUnifiedDiffForClipboard } from '@/lib/utils'
import type { FileDiff } from '@/types'

// =============================================================================
// TYPES
// =============================================================================

interface DiffPaneProps {
  sessionKey: string
}

interface FileDiffSectionProps {
  fileDiff: FileDiff
  defaultExpanded?: boolean
}

// =============================================================================
// UTILITIES
// =============================================================================

function formatCount(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

function getTotalStats(diffs: FileDiff[]): { additions: number; deletions: number; files: number } {
  return diffs.reduce(
    (acc, diff) => ({
      additions: acc.additions + diff.additions,
      deletions: acc.deletions + diff.deletions,
      files: acc.files + 1,
    }),
    { additions: 0, deletions: 0, files: 0 },
  )
}

// =============================================================================
// FILE DIFF SECTION - Per-file collapsible with copy
// =============================================================================

const FileDiffSection = memo(function FileDiffSection({
  fileDiff,
  defaultExpanded = true,
}: FileDiffSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const unifiedDiff = useMemo(() => formatUnifiedDiff(fileDiff), [fileDiff])
  const hasChanges = fileDiff.additions > 0 || fileDiff.deletions > 0

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      try {
        const clipboardText = formatUnifiedDiffForClipboard(fileDiff)
        await navigator.clipboard.writeText(clipboardText)
        setCopyState('copied')
        setTimeout(() => setCopyState('idle'), 2000)
      } catch {
        // Clipboard write failed - silently ignore
      }
    },
    [fileDiff],
  )

  // Extract just the filename from full path for compact display
  const fileName = fileDiff.file.split('/').pop() ?? fileDiff.file
  const filePath = fileDiff.file

  return (
    <div className="border border-border/80">
      {/* Header - Code Brutalism: hard edges, monospace, high contrast */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2',
          'bg-muted/30 hover:bg-muted/50',
          'transition-colors duration-100',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-inset',
        )}
        aria-expanded={isExpanded}
        aria-controls={`diff-content-${fileDiff.file}`}
      >
        {/* Chevron */}
        <span className="flex-shrink-0 text-muted-foreground">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>

        {/* File icon */}
        <FileCode className="h-4 w-4 flex-shrink-0 text-muted-foreground" />

        {/* Filename - monospace, truncated */}
        <span
          className="min-w-0 flex-1 truncate text-left font-mono text-xs text-foreground"
          title={filePath}
        >
          {fileName}
        </span>

        {/* Stats badges - utilitarian */}
        {hasChanges && (
          <span className="flex flex-shrink-0 items-center gap-2 text-[10px]">
            {fileDiff.additions > 0 && (
              <span className="flex items-center gap-0.5 font-mono text-green-500">
                <Plus className="h-3 w-3" />
                <span className="tabular-nums">{formatCount(fileDiff.additions)}</span>
              </span>
            )}
            {fileDiff.deletions > 0 && (
              <span className="flex items-center gap-0.5 font-mono text-red-500">
                <Minus className="h-3 w-3" />
                <span className="tabular-nums">{formatCount(fileDiff.deletions)}</span>
              </span>
            )}
          </span>
        )}

        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'flex-shrink-0 p-1',
            'text-muted-foreground hover:text-foreground',
            'transition-colors duration-100',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary',
            copyState === 'copied' && 'text-green-500',
          )}
          aria-label={copyState === 'copied' ? 'Copied!' : 'Copy diff to clipboard'}
          title={copyState === 'copied' ? 'Copied!' : 'Copy diff'}
        >
          {copyState === 'copied' ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </button>

      {/* Content - collapsible diff view */}
      {isExpanded && (
        <div id={`diff-content-${fileDiff.file}`} className="border-t border-border/60">
          <PierreDiffView diff={unifiedDiff} className="rounded-none border-0" />
        </div>
      )}
    </div>
  )
})

// =============================================================================
// HEADER CONTENT - Stats summary for pane header
// =============================================================================

export function DiffPaneHeaderContent({ sessionKey }: { sessionKey: string }) {
  const { state$ } = useSync()

  const diffs = (use$(state$.data.sessionDiffs[sessionKey]) as FileDiff[] | undefined) ?? []
  const stats = useMemo(() => getTotalStats(diffs), [diffs])

  if (stats.files === 0) {
    return <span className="text-[10px] text-muted-foreground">No changes</span>
  }

  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <span className="font-mono tabular-nums">
        {stats.files} {stats.files === 1 ? 'file' : 'files'}
      </span>
      {stats.additions > 0 && (
        <span className="flex items-center gap-0.5 font-mono text-green-500">
          <Plus className="h-2.5 w-2.5" />
          <span className="tabular-nums">{formatCount(stats.additions)}</span>
        </span>
      )}
      {stats.deletions > 0 && (
        <span className="flex items-center gap-0.5 font-mono text-red-500">
          <Minus className="h-2.5 w-2.5" />
          <span className="tabular-nums">{formatCount(stats.deletions)}</span>
        </span>
      )}
    </div>
  )
}

// =============================================================================
// HEADER ACTIONS - Optional actions slot
// =============================================================================

export function DiffPaneHeaderActions({ sessionKey: _sessionKey }: { sessionKey: string }) {
  // Placeholder for future actions (e.g., "Copy All", "Expand All")
  return null
}

// =============================================================================
// MAIN PANE CONTENT
// =============================================================================

export const DiffPane = memo(function DiffPane({ sessionKey }: DiffPaneProps) {
  const { state$, syncSessionDiffs } = useSync()
  const [isLoading, setIsLoading] = useState(false)

  const sessionDiffs = use$(state$.data.sessionDiffs[sessionKey]) as FileDiff[] | undefined
  const diffs = sessionDiffs ?? []

  useEffect(() => {
    let isActive = true

    if (sessionDiffs !== undefined) {
      setIsLoading(false)
      return () => {
        isActive = false
      }
    }

    setIsLoading(true)
    void syncSessionDiffs(sessionKey).finally(() => {
      if (isActive) {
        setIsLoading(false)
      }
    })

    return () => {
      isActive = false
    }
  }, [sessionDiffs, sessionKey, syncSessionDiffs])

  if (diffs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <FileCode className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            {isLoading ? 'Loading file changes...' : 'No file changes'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {isLoading
              ? 'Fetching session diffs from OpenCode.'
              : 'File diffs will appear here when the session modifies files.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Scrollable content area */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {diffs.map((fileDiff, index) => (
            <FileDiffSection
              key={`${fileDiff.file}-${index}`}
              fileDiff={fileDiff}
              defaultExpanded={diffs.length <= 3}
            />
          ))}
        </div>
      </div>
    </div>
  )
})
