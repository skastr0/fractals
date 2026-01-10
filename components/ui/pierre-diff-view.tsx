'use client'

import { parsePatchFiles } from '@pierre/diffs'
import { FileDiff, PatchDiff } from '@pierre/diffs/react'
import { type CSSProperties, memo, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface PierreDiffViewProps {
  diff: string
  className?: string
  /** Layout mode: 'unified' (stacked) or 'split' (side-by-side) */
  diffStyle?: 'unified' | 'split'
}

/**
 * Beautiful diff rendering using @pierre/diffs
 *
 * Features:
 * - Syntax highlighting via Shiki
 * - Word-level inline highlighting
 * - Line numbers
 * - Wrapped long lines
 * - Dark theme optimized for OpenCode
 */
export const PierreDiffView = memo(function PierreDiffView({
  diff,
  className,
  diffStyle = 'unified',
}: PierreDiffViewProps) {
  const diffStyleOverrides = {
    '--diffs-bg': 'transparent',
    '--diffs-bg-context-override': 'transparent',
    '--diffs-font-family': 'var(--font-mono)',
    '--diffs-font-size': '12px',
    '--diffs-line-height': '18px',
  } as CSSProperties

  const parsedPatches = useMemo(() => parsePatchFiles(diff, 'session'), [diff])
  const fileDiffs = useMemo(() => parsedPatches.flatMap((patch) => patch.files), [parsedPatches])
  const isSinglePatch = parsedPatches.length === 1 && fileDiffs.length === 1

  const options = {
    theme: 'pierre-dark',
    themeType: 'dark',
    diffStyle,
    diffIndicators: 'bars',
    lineDiffType: 'word',
    overflow: 'wrap',
    disableLineNumbers: false,
    disableFileHeader: true,
  } as const

  if (!diff.trim()) {
    return (
      <div
        className={cn(
          'rounded-md border border-dashed border-border bg-muted/20 px-3 py-2',
          className,
        )}
      >
        <span className="text-xs text-muted-foreground">No diff content available.</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-border bg-background/30',
        '[&_code]:font-mono [&_pre]:!bg-transparent',
        className,
      )}
    >
      {fileDiffs.length === 0 ? (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words p-3 text-xs text-muted-foreground">
          {diff}
        </pre>
      ) : isSinglePatch ? (
        <PatchDiff
          patch={diff}
          className="diff-view"
          style={diffStyleOverrides}
          options={options}
        />
      ) : (
        <div className="divide-y divide-border/60">
          {fileDiffs.map((fileDiff, index) => (
            <div key={`${fileDiff.name}-${index}`} className="py-2">
              <div className="px-3 pb-2 text-[11px] font-mono text-muted-foreground">
                {fileDiff.prevName && fileDiff.prevName !== fileDiff.name ? (
                  <span>
                    {fileDiff.prevName} → {fileDiff.name}
                  </span>
                ) : (
                  <span>{fileDiff.name}</span>
                )}
              </div>
              <FileDiff
                fileDiff={fileDiff}
                className="diff-view"
                style={diffStyleOverrides}
                options={options}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
