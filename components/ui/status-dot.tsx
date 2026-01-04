'use client'

import type { HTMLAttributes } from 'react'
import { tv } from 'tailwind-variants'

import { cn } from '@/lib/utils'
import type { SessionStatus as SessionStatusName } from '@/types'
import type { SessionStatusInput } from './session-status-badge'

const statusDotVariants = tv({
  base: 'relative inline-flex shrink-0 items-center justify-center',
  variants: {
    size: {
      sm: 'h-2 w-2',
      md: 'h-3 w-3',
      lg: 'h-4 w-4',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

const statusDotFillVariants = tv({
  base: 'h-full w-full rounded-full',
  variants: {
    status: {
      idle: 'bg-muted-foreground/50',
      busy: 'bg-green-500 animate-pulse',
      retry: 'bg-yellow-500 animate-pulse',
      pending_permission: 'bg-red-500 animate-pulse',
    },
  },
})

const busyPingClass = 'absolute inset-0 rounded-full bg-green-500/50 animate-ping'

export interface StatusDotProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  status: SessionStatusInput
  size?: 'sm' | 'md' | 'lg'
}

function getStatusType(status: SessionStatusInput): SessionStatusName {
  if (typeof status === 'string') {
    return status as SessionStatusName
  }

  return status.type
}

function getStatusLabel(statusType: SessionStatusName) {
  switch (statusType) {
    case 'idle':
      return 'Idle'
    case 'busy':
      return 'Running'
    case 'retry':
      return 'Retrying'
    case 'pending_permission':
      return 'Permission required'
    default:
      return 'Unknown'
  }
}

export function StatusDot({
  status,
  size = 'md',
  className,
  'aria-label': ariaLabel,
  ...props
}: StatusDotProps) {
  const statusType = getStatusType(status)
  const label = ariaLabel ?? getStatusLabel(statusType)

  return (
    <span
      className={cn(statusDotVariants({ size }), className)}
      role="img"
      aria-label={label}
      {...props}
    >
      <span className={statusDotFillVariants({ status: statusType })} />
      {statusType === 'busy' ? <span className={busyPingClass} /> : null}
    </span>
  )
}
