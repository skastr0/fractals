'use client'

import { Minus, Plus } from 'lucide-react'
import { memo } from 'react'
import { cn } from '@/lib/utils'

interface DiffStatsWidgetProps {
  additions: number
  deletions: number
  /** Size variant */
  size?: 'sm' | 'md'
  /** Click handler - opens diff pane */
  onClick?: () => void
  /** Show as interactive button */
  interactive?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Widget showing lines added/removed stats
 * Similar in style to the subagent collapse button
 */
export const DiffStatsWidget = memo(function DiffStatsWidget({
  additions,
  deletions,
  size = 'sm',
  onClick,
  interactive = true,
  className,
}: DiffStatsWidgetProps) {
  const hasChanges = additions > 0 || deletions > 0

  if (!hasChanges) {
    return null
  }

  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1'

  const content = (
    <>
      {additions > 0 && (
        <span className="flex items-center gap-0.5 text-green-500">
          <Plus className={iconSize} />
          <span className="tabular-nums">{formatCount(additions)}</span>
        </span>
      )}
      {deletions > 0 && (
        <span className="flex items-center gap-0.5 text-red-500">
          <Minus className={iconSize} />
          <span className="tabular-nums">{formatCount(deletions)}</span>
        </span>
      )}
    </>
  )

  if (!interactive || !onClick) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80',
          textSize,
          padding,
          className,
        )}
        title={`+${additions} / -${deletions} lines`}
      >
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80',
        'transition-all hover:border-primary/50 hover:bg-primary/5',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary',
        textSize,
        padding,
        className,
      )}
      title={`+${additions} / -${deletions} lines - Click to view diff`}
      aria-label={`View diff: ${additions} additions, ${deletions} deletions`}
    >
      {content}
    </button>
  )
})

function formatCount(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}
