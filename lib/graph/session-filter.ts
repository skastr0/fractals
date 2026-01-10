import type { Session } from '@/lib/opencode'

export const DEFAULT_SESSION_FILTER_HOURS = 24

const normalizeSearchValue = (value: string): string => value.toLowerCase().replace(/\s+/g, '')

export function fuzzyMatch(query: string, text: string): boolean {
  const normalizedQuery = normalizeSearchValue(query.trim())
  if (!normalizedQuery) {
    return true
  }
  const normalizedText = normalizeSearchValue(text)
  if (normalizedText.includes(normalizedQuery)) {
    return true
  }
  let lastIndex = -1
  for (const char of normalizedQuery) {
    const index = normalizedText.indexOf(char, lastIndex + 1)
    if (index === -1) {
      return false
    }
    lastIndex = index
  }
  return true
}

export function filterSessionsBySearch(sessions: Session[], searchTerm: string): Session[] {
  const query = searchTerm.trim()
  if (!query) {
    return sessions
  }
  return sessions.filter((session) => {
    const title = session.title ?? ''
    const id = session.id
    const directory = session.directory ?? ''
    return fuzzyMatch(query, title) || fuzzyMatch(query, id) || fuzzyMatch(query, directory)
  })
}

export const SESSION_TIME_FILTERS = [
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '7d', hours: 24 * 7 },
  { label: '30d', hours: 24 * 30 },
  { label: 'All', hours: Number.POSITIVE_INFINITY },
] as const

export type SessionTimeFilter = (typeof SESSION_TIME_FILTERS)[number]

export function filterSessionsByHours(
  sessions: Session[],
  hours: number,
  now: number = Date.now(),
): Session[] {
  if (!Number.isFinite(hours)) {
    return sessions
  }

  const cutoff = now - hours * 60 * 60 * 1000
  return sessions.filter((session) => {
    const updated = session.time.updated ?? session.time.created
    return updated >= cutoff
  })
}
