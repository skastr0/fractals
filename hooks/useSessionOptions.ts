'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOpenCode } from '@/context/OpenCodeProvider'
import { getActiveProject, useProject } from '@/context/ProjectProvider'

const RECENT_MODELS_KEY = 'opencode-tree-ui:recent-models'
const LAST_MODEL_KEY = 'opencode-tree-ui:last-model'
const MAX_RECENT_MODELS = 10

/**
 * Represents an AI model with its capabilities
 */
export interface ModelInfo {
  id: string
  name: string
  providerId: string
  providerName: string
  capabilities: {
    reasoning: boolean
    temperature: boolean
  }
  variants?: Record<string, Record<string, unknown>>
}

/**
 * Represents an AI agent configuration
 */
export interface AgentInfo {
  name: string
  description?: string
  mode: 'subagent' | 'primary' | 'all'
  color?: string
  hidden?: boolean
}

/** Model reference for storage */
export interface ModelRef {
  providerID: string
  modelID: string
}

export interface UseSessionOptionsResult {
  // Available options
  models: ModelInfo[]
  agents: AgentInfo[]
  variants: string[]

  // Organized model lists
  recentModels: ModelInfo[]
  allModels: ModelInfo[] // excludes recent

  // Current selections
  selectedModel: ModelInfo | null
  selectedAgent: AgentInfo | null
  selectedVariant: string | null

  // Actions
  setModel: (model: ModelInfo | null) => void
  setAgent: (agent: AgentInfo | null) => void
  setVariant: (variant: string | null) => void
  cycleAgent: (direction: 1 | -1) => void
  cycleVariant: () => void

  // Initialize from session's last message
  initializeFromMessage: (
    model: { providerID: string; modelID: string } | undefined,
    agent: string | undefined,
  ) => void

  // Loading state
  isLoading: boolean
  error: string | null

  // Get prompt parameters for SDK
  getPromptParams: () => {
    model?: { providerID: string; modelID: string }
    agent?: string
    variant?: string
  }
}

function loadRecentModels(): ModelRef[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(RECENT_MODELS_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, MAX_RECENT_MODELS)
  } catch {
    return []
  }
}

function saveRecentModels(models: ModelRef[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(RECENT_MODELS_KEY, JSON.stringify(models.slice(0, MAX_RECENT_MODELS)))
  } catch {
    // Ignore storage errors
  }
}

function loadLastModel(): ModelRef | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(LAST_MODEL_KEY)
    if (!stored) return null
    return JSON.parse(stored) as ModelRef
  } catch {
    return null
  }
}

function saveLastModel(model: ModelRef): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LAST_MODEL_KEY, JSON.stringify(model))
  } catch {
    // Ignore storage errors
  }
}

function addToRecentModels(model: ModelRef, current: ModelRef[]): ModelRef[] {
  // Remove if already exists, then add to front
  const filtered = current.filter(
    (m) => !(m.providerID === model.providerID && m.modelID === model.modelID),
  )
  const updated = [model, ...filtered].slice(0, MAX_RECENT_MODELS)
  return updated
}

export function useSessionOptions(): UseSessionOptionsResult {
  const { client } = useOpenCode()
  const { currentProject, projects, selectedProjectIds } = useProject()

  const activeProject = useMemo(
    () => getActiveProject({ currentProject, projects, selectedProjectIds }),
    [currentProject, projects, selectedProjectIds],
  )

  const [models, setModels] = useState<ModelInfo[]>([])
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [recentRefs, setRecentRefs] = useState<ModelRef[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selection state
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)

  // Load recent models from localStorage on mount
  useEffect(() => {
    setRecentRefs(loadRecentModels())
  }, [])

  // Track if we've initialized defaults (to avoid re-setting on every fetch)
  const [hasInitializedDefaults, setHasInitializedDefaults] = useState(false)
  const prevProjectIdRef = useRef<string | undefined>(undefined)

  // Reset initialization flag when project changes
  const currentProjectId = activeProject?.id
  if (currentProjectId !== prevProjectIdRef.current) {
    prevProjectIdRef.current = currentProjectId
    if (hasInitializedDefaults) {
      setHasInitializedDefaults(false)
      setSelectedModel(null)
      setSelectedAgent(null)
    }
  }

  // Fetch providers and agents - only depends on client and project, NOT selections
  useEffect(() => {
    if (!client) {
      return
    }

    if (!activeProject) {
      setModels([])
      setAgents([])
      setIsLoading(false)
      setError('Select a project to load models and agents.')
      return
    }

    const activeClient = client
    const activeProjectRef = activeProject

    const fetchOptions = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch providers (which contain models)
        const providersResult = await activeClient.provider.list(
          { directory: activeProjectRef.worktree },
          { throwOnError: true },
        )

        const providerData = providersResult.data
        if (!providerData) {
          throw new Error('No provider data returned')
        }

        const allModels: ModelInfo[] = []
        const connectedProviderIds = new Set(providerData.connected ?? [])

        // Get all providers, filter to only connected ones
        for (const provider of providerData.all ?? []) {
          // Only include connected providers
          if (!connectedProviderIds.has(provider.id)) continue

          // Iterate over models in the provider
          for (const [modelId, modelData] of Object.entries(provider.models)) {
            // Skip deprecated models
            if (modelData.status === 'deprecated') continue

            allModels.push({
              id: modelId,
              name: modelData.name,
              providerId: provider.id,
              providerName: provider.name,
              capabilities: {
                reasoning: modelData.reasoning,
                temperature: modelData.temperature,
              },
              variants: modelData.variants,
            })
          }
        }

        setModels(allModels)

        // Set default model only on first load (not when user has already selected)
        if (allModels.length > 0 && !hasInitializedDefaults) {
          // First, try to use the last selected model from localStorage
          const lastModel = loadLastModel()
          let defaultModel: ModelInfo | undefined

          if (lastModel) {
            defaultModel = allModels.find(
              (m) => m.providerId === lastModel.providerID && m.id === lastModel.modelID,
            )
          }

          // If no last model, try to find a default model from config
          if (!defaultModel) {
            const defaultProviders = providerData.default ?? {}
            for (const [providerId, modelId] of Object.entries(defaultProviders)) {
              defaultModel = allModels.find((m) => m.providerId === providerId && m.id === modelId)
              if (defaultModel) break
            }
          }

          // Fallback to first model
          setSelectedModel(defaultModel ?? allModels[0] ?? null)
        }

        // Fetch agents
        const agentsResult = await activeClient.app.agents(
          { directory: activeProjectRef.worktree },
          { throwOnError: true },
        )

        // Filter agents: not subagent AND not hidden (matching TUI behavior)
        const allAgents: AgentInfo[] = (agentsResult.data ?? [])
          .filter((agent) => agent.mode !== 'subagent' && !agent.hidden)
          .map((agent) => ({
            name: agent.name,
            description: agent.description,
            mode: agent.mode,
            color: agent.color,
            hidden: agent.hidden,
          }))

        setAgents(allAgents)

        // Set default agent only on first load
        if (allAgents.length > 0 && !hasInitializedDefaults) {
          const buildAgent = allAgents.find((a) => a.name === 'build')
          setSelectedAgent(buildAgent ?? allAgents[0] ?? null)
        }

        // Mark defaults as initialized
        setHasInitializedDefaults(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch options')
        console.error('Failed to fetch session options:', err)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchOptions()
  }, [activeProject, client, hasInitializedDefaults])

  // Compute recent models from refs
  const recentModels = useMemo(() => {
    return recentRefs
      .map((ref) => models.find((m) => m.providerId === ref.providerID && m.id === ref.modelID))
      .filter((m): m is ModelInfo => m !== undefined)
  }, [recentRefs, models])

  // Compute all models excluding recent
  const allModels = useMemo(() => {
    const recentSet = new Set(recentModels.map((m) => `${m.providerId}/${m.id}`))
    return models.filter((m) => !recentSet.has(`${m.providerId}/${m.id}`))
  }, [models, recentModels])

  // Available variants for the selected model
  const variants = useMemo(() => {
    if (!selectedModel?.variants) return []
    return Object.keys(selectedModel.variants)
  }, [selectedModel])

  // Reset variant when model changes
  useEffect(() => {
    if (selectedVariant && !variants.includes(selectedVariant)) {
      setSelectedVariant(null)
    }
  }, [variants, selectedVariant])

  // Actions
  const setModel = useCallback(
    (model: ModelInfo | null) => {
      setSelectedModel(model)

      // Add to recent models and persist as last selected
      if (model) {
        const ref: ModelRef = { providerID: model.providerId, modelID: model.id }
        const updated = addToRecentModels(ref, recentRefs)
        setRecentRefs(updated)
        saveRecentModels(updated)
        saveLastModel(ref)
      }
    },
    [recentRefs],
  )

  const setAgent = useCallback((agent: AgentInfo | null) => {
    setSelectedAgent(agent)
  }, [])

  const setVariant = useCallback((variant: string | null) => {
    setSelectedVariant(variant)
  }, [])

  const cycleAgent = useCallback(
    (direction: 1 | -1) => {
      if (agents.length === 0) return

      const currentIndex = selectedAgent
        ? agents.findIndex((a) => a.name === selectedAgent.name)
        : -1

      let nextIndex = currentIndex + direction
      if (nextIndex < 0) nextIndex = agents.length - 1
      if (nextIndex >= agents.length) nextIndex = 0

      setSelectedAgent(agents[nextIndex] ?? null)
    },
    [agents, selectedAgent],
  )

  const cycleVariant = useCallback(() => {
    if (variants.length === 0) {
      setSelectedVariant(null)
      return
    }

    const currentIndex = selectedVariant ? variants.indexOf(selectedVariant) : -1

    // Cycle: null -> first -> second -> ... -> null
    if (currentIndex === -1) {
      setSelectedVariant(variants[0] ?? null)
    } else if (currentIndex >= variants.length - 1) {
      setSelectedVariant(null)
    } else {
      setSelectedVariant(variants[currentIndex + 1] ?? null)
    }
  }, [variants, selectedVariant])

  const getPromptParams = useCallback(() => {
    const params: {
      model?: { providerID: string; modelID: string }
      agent?: string
      variant?: string
    } = {}

    if (selectedModel) {
      params.model = {
        providerID: selectedModel.providerId,
        modelID: selectedModel.id,
      }
    }

    if (selectedAgent) {
      params.agent = selectedAgent.name
    }

    if (selectedVariant) {
      params.variant = selectedVariant
    }

    return params
  }, [selectedModel, selectedAgent, selectedVariant])

  // Initialize model/agent from session's last message (only if not already set)
  const initializeFromMessage = useCallback(
    (
      messageModel: { providerID: string; modelID: string } | undefined,
      messageAgent: string | undefined,
    ) => {
      // Set model from message if available
      if (messageModel && models.length > 0) {
        const foundModel = models.find(
          (m) => m.providerId === messageModel.providerID && m.id === messageModel.modelID,
        )
        if (foundModel) {
          setSelectedModel(foundModel)
        }
      }

      // Set agent from message if available
      if (messageAgent && agents.length > 0) {
        const foundAgent = agents.find((a) => a.name === messageAgent)
        if (foundAgent) {
          setSelectedAgent(foundAgent)
        }
      }
    },
    [models, agents],
  )

  return {
    models,
    agents,
    variants,
    recentModels,
    allModels,
    selectedModel,
    selectedAgent,
    selectedVariant,
    setModel,
    setAgent,
    setVariant,
    cycleAgent,
    cycleVariant,
    initializeFromMessage,
    isLoading,
    error,
    getPromptParams,
  }
}
