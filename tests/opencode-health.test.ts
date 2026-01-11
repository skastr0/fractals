import { expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ToolOutputRenderer } from '../components/session/parts/tool-output'
import {
  selectSessionEvictions,
  shouldFetchSessionDiffs,
  shouldFetchSessionMessages,
} from '../context/SyncProvider'
import type { AssistantMessage, Message, Part, ToolPart, UserMessage } from '../lib/opencode'
import { checkServerHealth } from '../lib/opencode/health'
import { flattenMessages } from '../lib/session/flat-items'
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

test('selectSessionEvictions evicts expired sessions', () => {
  const entries: Array<[string, { lastAccess: number }]> = [
    ['session-a', { lastAccess: 0 }],
    ['session-b', { lastAccess: 1000 }],
    ['session-c', { lastAccess: 2000 }],
  ]

  expect(
    selectSessionEvictions({
      entries,
      activeSessions: new Set(['session-b']),
      maxSessions: 10,
      ttlMs: 3000,
      now: 10000,
    }),
  ).toEqual(['session-a', 'session-c'])
})

test('selectSessionEvictions evicts LRU when cache exceeds max', () => {
  const entries: Array<[string, { lastAccess: number }]> = [
    ['session-a', { lastAccess: 1000 }],
    ['session-b', { lastAccess: 2000 }],
    ['session-c', { lastAccess: 3000 }],
    ['session-d', { lastAccess: 4000 }],
  ]

  expect(
    selectSessionEvictions({
      entries,
      activeSessions: new Set(['session-b']),
      maxSessions: 2,
      ttlMs: 100000,
      now: 5000,
    }),
  ).toEqual(['session-a', 'session-c'])
})

test('collapsed edit tool output renders diff summary', () => {
  const part = {
    type: 'tool',
    tool: 'edit',
    state: {
      status: 'completed',
      input: { filePath: './src/index.ts' },
      metadata: { diff: '--- a/src/index.ts\n+++ b/src/index.ts\n@@\n-foo\n+bar\n' },
    },
  } as unknown as ToolPart

  const html = renderToStaticMarkup(createElement(ToolOutputRenderer, { part, isExpanded: false }))

  expect(html.includes('Diff ready')).toEqual(true)
  expect(html.includes('Expand to view diff')).toEqual(true)
})

const createUserMessage = (id: string, created: number): UserMessage =>
  ({
    id,
    role: 'user',
    time: { created },
    agent: 'test',
    model: { providerID: 'test', modelID: 'test' },
  }) as unknown as UserMessage

const createAssistantMessage = (id: string, parentID: string, created: number): AssistantMessage =>
  ({
    id,
    role: 'assistant',
    parentID,
    time: { created },
    agent: 'test',
    model: { providerID: 'test', modelID: 'test' },
  }) as unknown as AssistantMessage

const createTextPart = (id: string, text: string): Part =>
  ({
    id,
    type: 'text',
    text,
  }) as unknown as Part

test('flattenMessages reuses cached items for unchanged turns', () => {
  const cache = new Map()
  const user = createUserMessage('user-1', 1)
  const assistant = createAssistantMessage('assistant-1', user.id, 2)
  const partsByMessage = new Map<string, Part[]>([
    [user.id, [createTextPart('user-part-1', 'Hello')]],
    [assistant.id, [createTextPart('assistant-part-1', 'Hi there')]],
  ])

  const getParts = (messageId: string) => partsByMessage.get(messageId) ?? []
  const messages = [user, assistant]

  const first = flattenMessages({ messages, getParts, cache })
  const second = flattenMessages({ messages, getParts, cache })

  expect(second.length).toEqual(first.length)
  expect(second.every((item, index) => item === first[index])).toEqual(true)
})

test('flattenMessages rebuilds cached turns when parts change', () => {
  const cache = new Map()
  const user = createUserMessage('user-1', 1)
  const assistant = createAssistantMessage('assistant-1', user.id, 2)
  const partsByMessage = new Map<string, Part[]>([
    [user.id, [createTextPart('user-part-1', 'Hello')]],
    [assistant.id, [createTextPart('assistant-part-1', 'Hi there')]],
  ])

  const getParts = (messageId: string) => partsByMessage.get(messageId) ?? []
  const messages = [user, assistant]

  const first = flattenMessages({ messages, getParts, cache })

  partsByMessage.set(assistant.id, [createTextPart('assistant-part-1', 'Updated')])

  const second = flattenMessages({ messages, getParts, cache })

  expect(second[0] === first[0]).toEqual(false)
})

test('flattenMessages keeps cached item indexes accurate', () => {
  const cache = new Map()
  const userA = createUserMessage('user-a', 1)
  const assistantA = createAssistantMessage('assistant-a', userA.id, 2)
  const userB = createUserMessage('user-b', 3)
  const assistantB = createAssistantMessage('assistant-b', userB.id, 4)
  const partsByMessage = new Map<string, Part[]>([
    [userA.id, [createTextPart('user-part-a', 'Hello')]],
    [assistantA.id, [createTextPart('assistant-part-a', 'Hi')]],
    [userB.id, [createTextPart('user-part-b', 'Second')]],
    [assistantB.id, [createTextPart('assistant-part-b', 'Reply')]],
  ])

  const getParts = (messageId: string) => partsByMessage.get(messageId) ?? []
  const messages = [userA, assistantA, userB, assistantB]

  const first = flattenMessages({ messages, getParts, cache })
  const cachedItem = first.find((item) => item.id === `user-message-${userB.id}`)

  expect(Boolean(cachedItem)).toEqual(true)

  const userC = createUserMessage('user-c', 0)
  const assistantC = createAssistantMessage('assistant-c', userC.id, 0.5)
  partsByMessage.set(userC.id, [createTextPart('user-part-c', 'First')])
  partsByMessage.set(assistantC.id, [createTextPart('assistant-part-c', 'Ack')])

  const nextMessages = [userC, assistantC, ...messages]
  const second = flattenMessages({ messages: nextMessages, getParts, cache })
  const updatedItem = second.find((item) => item.id === `user-message-${userB.id}`)

  expect(updatedItem === cachedItem).toEqual(true)
  expect(updatedItem?.index).toEqual(second.indexOf(updatedItem as NonNullable<typeof updatedItem>))
})
