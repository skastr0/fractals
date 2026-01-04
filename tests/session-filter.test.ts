import { expect, test } from 'bun:test'
import { filterSessionsByHours } from '@/lib/graph/session-filter'
import type { Session } from '@/lib/opencode'

const createSession = ({
  id,
  updated,
  created = updated,
}: {
  id: string
  updated: number
  created?: number
}): Session => ({
  id,
  projectID: 'project-1',
  directory: '/tmp/project',
  title: 'Session',
  version: '1',
  time: { created, updated },
})

test('filterSessionsByHours keeps sessions within cutoff', () => {
  const now = 1_700_000_000_000
  const recent = createSession({ id: 'recent', updated: now - 60 * 60 * 1000 })
  const old = createSession({ id: 'old', updated: now - 25 * 60 * 60 * 1000 })

  const result = filterSessionsByHours([recent, old], 24, now)

  expect(result).toEqual([recent])
})

test('filterSessionsByHours returns all sessions for Infinity', () => {
  const now = 1_700_000_000_000
  const recent = createSession({ id: 'recent', updated: now - 60 * 60 * 1000 })
  const old = createSession({ id: 'old', updated: now - 25 * 60 * 60 * 1000 })

  const result = filterSessionsByHours([recent, old], Number.POSITIVE_INFINITY, now)

  expect(result).toEqual([recent, old])
})
