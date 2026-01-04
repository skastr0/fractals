'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { memo } from 'react'
import type { Part } from '@/lib/opencode'
import { formatRelativeTime } from '@/lib/utils/date'

type RetryPart = Extract<Part, { type: 'retry' }>

interface RetryPartRendererProps {
  part: RetryPart
}

export const RetryPartRenderer = memo(function RetryPartRenderer({ part }: RetryPartRendererProps) {
  const errorMessage = part.error.data?.message ?? part.error.name

  return (
    <div className="overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/10">
      <div className="flex items-center gap-2 px-3 py-2">
        <RefreshCw className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium text-amber-500">Retry attempt {part.attempt}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {formatRelativeTime(part.time.created)}
        </span>
      </div>
      <div className="flex items-start gap-2 border-t border-amber-500/20 bg-background/50 px-3 py-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">{part.error.name}</p>
          <p className="text-xs text-muted-foreground">{errorMessage}</p>
          {part.error.data?.statusCode ? (
            <span className="mt-1 inline-block rounded bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px]">
              Status: {part.error.data.statusCode}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
})
