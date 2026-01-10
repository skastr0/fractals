'use client'

import type { Observable } from '@legendapp/state'
import { use$, useObservable } from '@legendapp/state/react'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from 'react'

import type { Agent } from '@/lib/opencode'

import { useOpenCode } from './OpenCodeProvider'

// =============================================================================
// STATE SHAPE
// =============================================================================
export interface AgentColorState {
  agents: Record<string, Agent>
  isLoading: boolean
  error: string | null
}

// =============================================================================
// CONTEXT VALUE
// =============================================================================
export interface AgentColorContextValue {
  /** Observable state for fine-grained subscriptions */
  state$: Observable<AgentColorState>

  /** Get agent color by name (returns undefined if not found) */
  getAgentColor: (agentName: string) => string | undefined

  /** Get all agents */
  getAgents: () => Agent[]

  /** Refresh agents from server */
  refresh: () => Promise<void>
}

const AgentColorContext = createContext<AgentColorContextValue | null>(null)

// =============================================================================
// PROVIDER
// =============================================================================
export function AgentColorProvider({ children }: { children: ReactNode }) {
  const { client } = useOpenCode()

  const state$ = useObservable<AgentColorState>({
    agents: {},
    isLoading: false,
    error: null,
  })

  const fetchAgents = useCallback(async () => {
    if (!client) {
      return
    }

    state$.isLoading.set(true)
    state$.error.set(null)

    try {
      const result = await client.app.agents()
      const agentList = result.data ?? []

      const agentsMap: Record<string, Agent> = {}
      for (const agent of agentList) {
        agentsMap[agent.name] = agent
      }

      state$.agents.set(agentsMap)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch agents'
      state$.error.set(message)
    } finally {
      state$.isLoading.set(false)
    }
  }, [client, state$])

  // Fetch agents when client becomes available
  useEffect(() => {
    if (client) {
      void fetchAgents()
    }
  }, [client, fetchAgents])

  const getAgentColor = useCallback(
    (agentName: string): string | undefined => {
      return state$.agents.peek()[agentName]?.color
    },
    [state$],
  )

  const getAgents = useCallback((): Agent[] => {
    return Object.values(state$.agents.peek())
  }, [state$])

  const value = useMemo<AgentColorContextValue>(
    () => ({
      state$,
      getAgentColor,
      getAgents,
      refresh: fetchAgents,
    }),
    [state$, getAgentColor, getAgents, fetchAgents],
  )

  return <AgentColorContext.Provider value={value}>{children}</AgentColorContext.Provider>
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Access the agent color context
 */
export function useAgentColors(): AgentColorContextValue {
  const context = useContext(AgentColorContext)
  if (!context) {
    throw new Error('useAgentColors must be used within AgentColorProvider')
  }
  return context
}

/**
 * Reactively get an agent's color by name
 * Returns undefined if not found, allowing fallback to depth-based colors
 */
export function useAgentColor(agentName: string | undefined): string | undefined {
  const { state$ } = useAgentColors()
  return use$(() => (agentName ? state$.agents[agentName]?.color.get() : undefined))
}

/**
 * Reactively get all agents
 */
export function useAgents(): Agent[] {
  const { state$ } = useAgentColors()
  return use$(() => Object.values(state$.agents.get()))
}
