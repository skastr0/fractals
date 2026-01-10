'use client'

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'

import { DEFAULT_SESSION_FILTER_HOURS } from '@/lib/graph/session-filter'

interface SessionFilterContextValue {
  filterHours: number
  setFilterHours: (hours: number) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
}

const SessionFilterContext = createContext<SessionFilterContextValue | null>(null)

interface SessionFilterProviderProps {
  children: ReactNode
}

export function SessionFilterProvider({ children }: SessionFilterProviderProps) {
  const [filterHours, setFilterHoursState] = useState(DEFAULT_SESSION_FILTER_HOURS)
  const [searchTerm, setSearchTermState] = useState('')

  const setFilterHours = useCallback((hours: number) => {
    setFilterHoursState(hours)
  }, [])

  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term)
  }, [])

  const value = useMemo(
    () => ({ filterHours, setFilterHours, searchTerm, setSearchTerm }),
    [filterHours, setFilterHours, searchTerm, setSearchTerm],
  )

  return <SessionFilterContext.Provider value={value}>{children}</SessionFilterContext.Provider>
}

export function useSessionFilter() {
  const context = useContext(SessionFilterContext)
  if (!context) {
    throw new Error('useSessionFilter must be used within a SessionFilterProvider')
  }
  return context
}
