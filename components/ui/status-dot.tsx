'use client'

import type { HTMLAttributes } from 'react'
import { tv } from 'tailwind-variants'

import type { SessionStatus as SessionStatusName } from '@/types'
import type { SessionStatusInput } from './session-status-badge'

const statusDotVariants = tv({
  base: 'inline-flex shrink-0 rounded-full',
  variants: {
    status: {
      idle: 'bg-muted-foreground',
      busy: 'bg-primary animate-pulse',
      retry: 'bg-warning',
      pending_permission: 'bg-error animate-pulse',
    },
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
      className={statusDotVariants({ status: statusType, size, className })}
      role="img"
      aria-label={label}
      {...props}
    />
  )
}
