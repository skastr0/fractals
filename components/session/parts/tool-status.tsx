'use client'

import { Check, Clock, Loader2, X } from 'lucide-react'
import { memo } from 'react'
import type { ToolPart } from '@/lib/opencode'

import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/utils/date'

interface ToolStatusProps {
  state: ToolPart['state']
}

const STATUS_STYLES = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-muted text-muted-foreground',
  },
  running: {
    label: 'Running',
    icon: Loader2,
    className: 'bg-primary/15 text-primary',
    animate: true,
  },
  completed: {
    label: 'Completed',
    icon: Check,
    className: 'bg-success/15 text-success',
  },
  error: {
    label: 'Error',
    icon: X,
    className: 'bg-error/15 text-error',
  },
} as const

export const ToolStatus = memo(function ToolStatus({ state }: ToolStatusProps) {
  const config = STATUS_STYLES[state.status]
  const Icon = config.icon

  const duration =
    state.status === 'completed' || state.status === 'error'
      ? formatDuration(state.time.end - state.time.start)
      : null

  const shouldAnimate = 'animate' in config && config.animate

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
        config.className,
      )}
    >
      <Icon className={cn('h-3 w-3', shouldAnimate ? 'animate-spin' : '')} />
      <span>{config.label}</span>
      {duration ? <span className="opacity-70">{duration}</span> : null}
    </span>
  )
})
