'use client'

import { AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { tv } from 'tailwind-variants'

import type { SessionStatus as SessionStatusName } from '@/types'

const statusBadgeVariants = tv({
  base: 'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
  variants: {
    status: {
      idle: 'bg-muted text-muted-foreground',
      busy: 'bg-primary/20 text-primary',
      retry: 'bg-warning/20 text-warning',
      pending_permission: 'bg-error/20 text-error',
    },
  },
})

export type SessionStatusInput =
  | SessionStatusName
  | {
      type: 'retry'
      attempt?: number
      next?: number
      message?: string
    }
  | {
      type: Exclude<SessionStatusName, 'retry'>
    }

export interface SessionStatusBadgeProps {
  status: SessionStatusInput
  showLabel?: boolean
  className?: string
  ariaLabel?: string
}

type RetryStatus = Extract<SessionStatusInput, { type: 'retry' }>

function getStatusType(status: SessionStatusInput): SessionStatusName {
  if (typeof status === 'string') {
    return status as SessionStatusName
  }

  return status.type
}

function getRetryStatus(status: SessionStatusInput): RetryStatus | null {
  if (typeof status === 'string' || status.type !== 'retry') {
    return null
  }

  return status
}

function computeSecondsLeft(next?: number) {
  if (typeof next !== 'number') {
    return null
  }

  const remaining = Math.ceil((next - Date.now()) / 1000)
  return Math.max(0, remaining)
}

function useRetryCountdown(next?: number) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() => computeSecondsLeft(next))

  useEffect(() => {
    if (typeof next !== 'number') {
      setSecondsLeft(null)
      return
    }

    setSecondsLeft(computeSecondsLeft(next))

    const interval = setInterval(() => {
      setSecondsLeft(computeSecondsLeft(next))
    }, 1000)

    return () => clearInterval(interval)
  }, [next])

  return secondsLeft
}

function getStatusLabel(
  statusType: SessionStatusName,
  retryStatus: RetryStatus | null,
  secondsLeft: number | null,
) {
  switch (statusType) {
    case 'idle':
      return 'Idle'
    case 'busy':
      return 'Running'
    case 'retry': {
      if (secondsLeft === null) {
        return 'Retrying'
      }

      const attemptLabel = retryStatus?.attempt ? `Retry #${retryStatus.attempt}` : 'Retry'
      return `${attemptLabel} in ${secondsLeft}s`
    }
    case 'pending_permission':
      return 'Permission required'
    default:
      return 'Unknown'
  }
}

function getStatusIcon(statusType: SessionStatusName) {
  switch (statusType) {
    case 'idle':
      return <CheckCircle className="h-3 w-3" />
    case 'busy':
      return <Loader2 className="h-3 w-3 animate-spin" />
    case 'retry':
      return <Clock className="h-3 w-3 animate-pulse" />
    case 'pending_permission':
      return <AlertCircle className="h-3 w-3 animate-pulse" />
    default:
      return <CheckCircle className="h-3 w-3" />
  }
}

export function SessionStatusBadge({
  status,
  showLabel = true,
  className,
  ariaLabel,
}: SessionStatusBadgeProps) {
  const statusType = getStatusType(status)
  const retryStatus = getRetryStatus(status)
  const secondsLeft = useRetryCountdown(retryStatus?.next)
  const label = getStatusLabel(statusType, retryStatus, secondsLeft)

  return (
    <output
      className={statusBadgeVariants({ status: statusType, className })}
      aria-label={ariaLabel ?? label}
      title={retryStatus?.message}
    >
      {getStatusIcon(statusType)}
      {showLabel ? <span>{label}</span> : null}
    </output>
  )
}
