'use client'

import { SESSION_TIME_FILTERS } from '@/lib/graph/session-filter'
import { cn } from '@/lib/utils'

interface SessionFilterProps {
  value: number
  onChange: (hours: number) => void
  sessionCount: number
  filteredCount: number
}

export function SessionFilter({
  value,
  onChange,
  sessionCount,
  filteredCount,
}: SessionFilterProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-background/80 px-4 py-2">
      <span className="text-xs text-muted-foreground">Show:</span>
      <div className="flex gap-1">
        {SESSION_TIME_FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            onClick={() => onChange(filter.hours)}
            className={cn(
              'rounded px-2 py-1 text-xs transition-colors',
              value === filter.hours
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <span className="ml-auto text-xs text-muted-foreground">
        {filteredCount} of {sessionCount} sessions
      </span>
    </div>
  )
}
