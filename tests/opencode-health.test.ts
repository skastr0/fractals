import { expect, test } from 'bun:test'

import { shouldFetchSessionDiffs, shouldFetchSessionMessages } from '../context/SyncProvider'
import type { Message } from '../lib/opencode'
import { checkServerHealth } from '../lib/opencode/health'
import type { FileDiff } from '../types'

test('checkServerHealth returns connected details', async () => {
  const mockFetch: typeof fetch = async (input) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

    if (url.endsWith('/global/health')) {
      return new Response(JSON.stringify({ healthy: true, version: '1.0.0' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    return new Response('Not Found', { status: 404 })
  }

  const result = await checkServerHealth({
    baseUrl: 'http://localhost:5577',
    fetch: mockFetch,
  })

  expect(result).toEqual({
    connected: true,
    url: 'http://localhost:5577',
    version: '1.0.0',
  })
})

test('shouldFetchSessionMessages skips hydrated cache', () => {
  const hydratedMessages = [{ id: 'message-1' } as Message]

  expect(
    shouldFetchSessionMessages({
      existingMessages: hydratedMessages,
      needsHydration: false,
    }),
  ).toEqual(false)
})

test('shouldFetchSessionMessages fetches when messages are missing', () => {
  expect(
    shouldFetchSessionMessages({
      existingMessages: [],
      needsHydration: false,
    }),
  ).toEqual(true)
})

test('shouldFetchSessionMessages fetches when hydration is required', () => {
  const hydratedMessages = [{ id: 'message-2' } as Message]

  expect(
    shouldFetchSessionMessages({
      existingMessages: hydratedMessages,
      needsHydration: true,
    }),
  ).toEqual(true)
})

test('shouldFetchSessionMessages fetches when forced', () => {
  const hydratedMessages = [{ id: 'message-3' } as Message]

  expect(
    shouldFetchSessionMessages({
      existingMessages: hydratedMessages,
      needsHydration: false,
      force: true,
    }),
  ).toEqual(true)
})

test('shouldFetchSessionDiffs skips when diffs exist', () => {
  const diffs: FileDiff[] = [
    { file: 'src/index.ts', before: '', after: '', additions: 2, deletions: 1 },
  ]

  expect(
    shouldFetchSessionDiffs({
      existingDiffs: diffs,
      summary: { additions: 2, deletions: 1, files: 1 },
    }),
  ).toEqual(false)
})

test('shouldFetchSessionDiffs fetches when summary has changes', () => {
  expect(
    shouldFetchSessionDiffs({
      existingDiffs: undefined,
      summary: { additions: 3, deletions: 1, files: 1 },
    }),
  ).toEqual(true)
})

test('shouldFetchSessionDiffs skips when summary has no changes', () => {
  expect(
    shouldFetchSessionDiffs({
      existingDiffs: undefined,
      summary: { additions: 0, deletions: 0, files: 0 },
    }),
  ).toEqual(false)
})

test('shouldFetchSessionDiffs fetches when summary missing', () => {
  expect(
    shouldFetchSessionDiffs({
      existingDiffs: undefined,
      summary: undefined,
    }),
  ).toEqual(true)
})

test('shouldFetchSessionDiffs fetches when forced', () => {
  expect(
    shouldFetchSessionDiffs({
      existingDiffs: [],
      summary: { additions: 0, deletions: 0, files: 0 },
      force: true,
    }),
  ).toEqual(true)
})
