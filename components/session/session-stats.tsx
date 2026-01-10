'use client'

import { Coins, Gauge, Square, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SessionStats } from '@/hooks/useSessionStats'

interface SessionStatsDisplayProps {
  stats: SessionStats
  contextLimit: number | null
  isWorking: boolean
  onStop: () => void
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  }
  return num.toString()
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0'
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

// Default context limit for common models when we can't look it up
const DEFAULT_CONTEXT_LIMIT = 200_000

export function SessionStatsDisplay({
  stats,
  contextLimit,
  isWorking,
  onStop,
}: SessionStatsDisplayProps) {
  const { tokens } = stats

  // Use provided contextLimit or fall back to default
  const effectiveLimit = contextLimit ?? DEFAULT_CONTEXT_LIMIT
  const hasKnownLimit = contextLimit !== null

  // Calculate context percentage
  const contextPercent =
    tokens.currentContext > 0 ? Math.min(100, (tokens.currentContext / effectiveLimit) * 100) : null

  // Determine context bar color based on usage
  const getContextColor = (percent: number) => {
    if (percent >= 90) return 'bg-error'
    if (percent >= 70) return 'bg-warning'
    return 'bg-primary'
  }

  // Only show stats if we have any data
  const hasTokenData = tokens.input > 0 || tokens.output > 0

  if (!hasTokenData && !isWorking) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      {/* Context Window Progress */}
      {contextPercent !== null && (
        <div
          className="flex items-center gap-1.5"
          title={`Context: ${tokens.currentContext.toLocaleString()} / ${effectiveLimit.toLocaleString()} tokens${!hasKnownLimit ? ' (estimated)' : ''}`}
        >
          <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${getContextColor(contextPercent)}`}
                style={{ width: `${contextPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
              {contextPercent.toFixed(0)}%{!hasKnownLimit && <span className="opacity-60">~</span>}
            </span>
          </div>
        </div>
      )}

      {/* Token Stats */}
      {hasTokenData && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {/* Total output */}
          <span
            className="flex items-center gap-1"
            title={`Output: ${tokens.output.toLocaleString()} tokens`}
          >
            <Zap className="h-3 w-3" />
            <span className="tabular-nums">{formatNumber(tokens.output)}</span>
          </span>
          {/* Cost */}
          {tokens.cost > 0 && (
            <span className="flex items-center gap-1" title={`Cost: ${formatCost(tokens.cost)}`}>
              <Coins className="h-3 w-3" />
              <span className="tabular-nums">{formatCost(tokens.cost)}</span>
            </span>
          )}
        </div>
      )}

      {/* Stop Button */}
      {isWorking && (
        <Button
          variant="destructive"
          size="sm"
          onPress={onStop}
          aria-label="Stop session"
          className="h-6 px-2 text-xs"
        >
          <Square className="mr-1 h-3 w-3 fill-current" />
          Stop
        </Button>
      )}
    </div>
  )
}
