'use client'

import { memo, useMemo } from 'react'

import { cn } from '@/lib/utils'
import { classifyDiffLine, type DiffLineKind } from '@/lib/utils/diff'

interface DiffViewProps {
  diff: string
  className?: string
}

const LINE_STYLES: Record<DiffLineKind, string> = {
  add: 'bg-emerald-500/10 text-emerald-200',
  remove: 'bg-rose-500/10 text-rose-200',
  context: 'text-muted-foreground/80',
  meta: 'bg-muted/40 text-muted-foreground',
  hunk: 'bg-amber-500/10 text-amber-200',
}

export const DiffView = memo(function DiffView({ diff, className }: DiffViewProps) {
  const lines = useMemo(() => diff.replace(/\r\n/g, '\n').split('\n'), [diff])

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
      className={cn('overflow-hidden rounded-md border border-border bg-background/30', className)}
    >
      <div className="max-h-[60vh] overflow-auto">
        {lines.map((line, index) => (
          <div
            key={`${index}-${line}`}
            className={cn(
              'whitespace-pre px-3 py-0.5 text-xs font-mono',
              LINE_STYLES[classifyDiffLine(line)],
            )}
          >
            {line || ' '}
          </div>
        ))}
      </div>
    </div>
  )
})
