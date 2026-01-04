'use client'

import { useSessionFilter } from '@/context/SessionFilterProvider'
import { useSessions } from '@/hooks/useSessions'
import { SESSION_TIME_FILTERS } from '@/lib/graph/session-filter'
import { cn } from '@/lib/utils'

export function TimeFilterBar() {
  const { filterHours, setFilterHours } = useSessionFilter()
  const { sessions } = useSessions()
  const sessionCount = sessions.length

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/30 p-0.5">
        {SESSION_TIME_FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            onClick={() => setFilterHours(filter.hours)}
            className={cn(
              'rounded px-2 py-1 text-xs font-medium transition-colors',
              filterHours === filter.hours
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{sessionCount} sessions</span>
    </div>
  )
}
