'use client'

import { use$ } from '@legendapp/state/react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import { useSync } from '@/context/SyncProvider'
import {
  canDismissSessionError,
  classifySessionError,
  getSessionErrorSignature,
  type SessionError,
} from '@/lib/opencode/errors'

interface SessionErrorBannerProps {
  sessionKey: string
}

const bannerVariants = tv({
  base: [
    'flex items-start gap-3 rounded-lg border px-4 py-3',
    'animate-in fade-in slide-in-from-top-2 duration-200',
  ],
  variants: {
    severity: {
      critical: 'border-red-500/50 bg-red-500/10 text-red-200',
      dismissable: 'border-orange-500/50 bg-orange-500/10 text-orange-200',
    },
  },
  defaultVariants: {
    severity: 'dismissable',
  },
})

/**
 * Session error banner component
 *
 * Displays errors from the OpenCode SDK with appropriate severity styling
 * and dismiss controls. Critical errors (like ProviderAuthError) cannot be dismissed.
 */
export const SessionErrorBanner = memo(function SessionErrorBanner({
  sessionKey,
}: SessionErrorBannerProps) {
  const { state$, dismissSessionError } = useSync()

  // Subscribe to session error for this session
  const sessionError = use$(state$.data.sessionErrors[sessionKey]) as SessionError | undefined
  const dismissedSignature = use$(state$.data.dismissedErrors[sessionKey]) as string | undefined

  // Check if current error is dismissed
  const currentSignature = useMemo(
    () => getSessionErrorSignature(sessionError ?? null),
    [sessionError],
  )
  const isDismissed = currentSignature === dismissedSignature

  // Classify the error for display treatment
  const classified = useMemo(() => classifySessionError(sessionError ?? null), [sessionError])

  // Don't show anything if no error, already dismissed, or error is hidden type
  if (!classified || isDismissed) {
    return null
  }

  const canDismiss = canDismissSessionError(sessionError ?? null)

  const handleDismiss = () => {
    dismissSessionError(sessionKey)
  }

  return (
    <div
      className={bannerVariants({
        severity: classified.classification === 'critical' ? 'critical' : 'dismissable',
      })}
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{classified.message}</div>
        {classified.hint && <div className="mt-1 text-xs opacity-80">{classified.hint}</div>}
      </div>
      {canDismiss && (
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 hover:bg-white/10 transition-colors"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
})

/**
 * Retry status indicator component
 *
 * Shows when a session is in retry status (automatic retry in progress)
 */
interface SessionRetryBannerProps {
  sessionKey: string
}

export const SessionRetryBanner = memo(function SessionRetryBanner({
  sessionKey,
}: SessionRetryBannerProps) {
  const { state$ } = useSync()

  // Subscribe to session status
  const liveStatus = use$(state$.data.sessionStatus[sessionKey]) as
    | { type: string; message?: string; attempt?: number; nextRetryAt?: number }
    | undefined

  // Only show for retry status
  if (liveStatus?.type !== 'retry') {
    return null
  }

  return (
    <output className="flex items-center gap-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-yellow-200 animate-in fade-in slide-in-from-top-2 duration-200">
      <RefreshCw className="h-5 w-5 shrink-0 animate-spin" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">
          Retrying request...
          {liveStatus.attempt && ` (attempt ${liveStatus.attempt})`}
        </div>
        {liveStatus.message && <div className="mt-1 text-xs opacity-80">{liveStatus.message}</div>}
      </div>
    </output>
  )
})
