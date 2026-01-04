'use client'

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'

import { DEFAULT_SESSION_FILTER_HOURS } from '@/lib/graph/session-filter'

interface SessionFilterContextValue {
  filterHours: number
  setFilterHours: (hours: number) => void
}

const SessionFilterContext = createContext<SessionFilterContextValue | null>(null)

interface SessionFilterProviderProps {
  children: ReactNode
}

export function SessionFilterProvider({ children }: SessionFilterProviderProps) {
  const [filterHours, setFilterHoursState] = useState(DEFAULT_SESSION_FILTER_HOURS)

  const setFilterHours = useCallback((hours: number) => {
    setFilterHoursState(hours)
  }, [])

  const value = useMemo(() => ({ filterHours, setFilterHours }), [filterHours, setFilterHours])

  return <SessionFilterContext.Provider value={value}>{children}</SessionFilterContext.Provider>
}

export function useSessionFilter() {
  const context = useContext(SessionFilterContext)
  if (!context) {
    throw new Error('useSessionFilter must be used within a SessionFilterProvider')
  }
  return context
}
