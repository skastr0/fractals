import { expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { type SessionStats, useSessionStats } from '../hooks/useSessionStats'
import type { AssistantMessage, Message, UserMessage } from '../lib/opencode'

type StatsProbeProps = {
  messages: Message[]
  onStats: (stats: SessionStats) => void
}

const StatsProbe = ({ messages, onStats }: StatsProbeProps) => {
  const stats = useSessionStats(messages)
  onStats(stats)
  return null
}

const getSessionStats = (messages: Message[]): SessionStats => {
  let captured: SessionStats | undefined

  renderToStaticMarkup(
    createElement(StatsProbe, {
      messages,
      onStats: (stats) => {
        captured = stats
      },
    }),
  )

  if (!captured) {
    throw new Error('Expected stats to be captured')
  }

  return captured
}

const createUserMessage = (id: string): UserMessage =>
  ({
    id,
    role: 'user',
    time: { created: 1 },
    agent: 'test',
    model: { providerID: 'test', modelID: 'test' },
  }) as unknown as UserMessage

const createAssistantMessage = (
  id: string,
  parentID: string,
  created: number,
  tokens?: AssistantMessage['tokens'],
): AssistantMessage =>
  ({
    id,
    role: 'assistant',
    parentID,
    time: { created },
    agent: 'test',
    model: { providerID: 'test', modelID: 'test' },
    tokens,
  }) as unknown as AssistantMessage

test('useSessionStats uses latest assistant total tokens for currentContext', () => {
  const first = createAssistantMessage('assistant-1', 'user-1', 1, {
    input: 2,
    output: 1,
    reasoning: 1,
    cache: { read: 3, write: 4 },
  })
  const second = createAssistantMessage('assistant-2', 'user-2', 2, {
    input: 5,
    output: 6,
    reasoning: 7,
    cache: { read: 8, write: 9 },
  })

  const stats = getSessionStats([first, second])

  expect(stats.tokens.currentContext).toEqual(35)
})

test('useSessionStats returns zero currentContext without assistants', () => {
  const stats = getSessionStats([createUserMessage('user-1')])

  expect(stats.tokens.currentContext).toEqual(0)
})
