'use client'

import { useMemo } from 'react'
import type { AssistantMessage, Message } from '@/lib/opencode'

export interface TokenStats {
  /** Total input tokens across all messages */
  input: number
  /** Total output tokens across all messages */
  output: number
  /** Total reasoning tokens across all messages */
  reasoning: number
  /** Total cache read tokens */
  cacheRead: number
  /** Total cache write tokens */
  cacheWrite: number
  /** Sum of input + output + reasoning */
  total: number
  /** Total cost in dollars */
  cost: number
  /** Current context window usage (total tokens from latest assistant message) */
  currentContext: number
}

export interface SessionStats {
  tokens: TokenStats
  messageCount: number
  assistantMessageCount: number
}

function isAssistantMessage(message: Message): message is AssistantMessage {
  return message.role === 'assistant'
}

function computeTotalTokens(tokens: AssistantMessage['tokens'] | null | undefined): number {
  if (!tokens) {
    return 0
  }

  return (
    (tokens.input ?? 0) +
    (tokens.output ?? 0) +
    (tokens.reasoning ?? 0) +
    (tokens.cache?.read ?? 0) +
    (tokens.cache?.write ?? 0)
  )
}

/**
 * Computes aggregated statistics from session messages.
 * Calculates total tokens (input, output, reasoning, cache) and cost.
 * Also tracks current context window usage from the latest assistant message.
 */
export function useSessionStats(messages: Message[]): SessionStats {
  return useMemo(() => {
    const assistantMessages = messages.filter(isAssistantMessage)

    // Get the latest assistant message for current context estimate
    const latestAssistant =
      assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null

    // Current context is the total tokens from the latest assistant message
    // This represents how much of the context window was used in that call
    const currentContext = computeTotalTokens(latestAssistant?.tokens)

    const tokens = assistantMessages.reduce<TokenStats>(
      (acc, msg) => {
        const t = msg.tokens
        return {
          input: acc.input + (t?.input ?? 0),
          output: acc.output + (t?.output ?? 0),
          reasoning: acc.reasoning + (t?.reasoning ?? 0),
          cacheRead: acc.cacheRead + (t?.cache?.read ?? 0),
          cacheWrite: acc.cacheWrite + (t?.cache?.write ?? 0),
          total: acc.total + (t?.input ?? 0) + (t?.output ?? 0) + (t?.reasoning ?? 0),
          cost: acc.cost + (msg.cost ?? 0),
          currentContext, // Set from latest message, not accumulated
        }
      },
      {
        input: 0,
        output: 0,
        reasoning: 0,
        cacheRead: 0,
        cacheWrite: 0,
        total: 0,
        cost: 0,
        currentContext,
      },
    )

    return {
      tokens,
      messageCount: messages.length,
      assistantMessageCount: assistantMessages.length,
    }
  }, [messages])
}
