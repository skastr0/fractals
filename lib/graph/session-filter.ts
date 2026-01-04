import type { Session } from '@/lib/opencode'

export const DEFAULT_SESSION_FILTER_HOURS = 24

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
