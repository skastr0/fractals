'use client'

import { useEffect, useMemo, useState } from 'react'
import { useOpenCode } from '@/context/OpenCodeProvider'
import { getActiveProject, useProject } from '@/context/ProjectProvider'
import type { AssistantMessage, Message, UserMessage } from '@/lib/opencode'

export interface ModelLimit {
  context: number
  output: number
}

export interface ModelInfoResult {
  modelId: string | null
  providerId: string | null
  contextLimit: number | null
  outputLimit: number | null
  isLoading: boolean
}

function isUserMessage(message: Message): message is UserMessage {
  return message.role === 'user'
}

function isAssistantMessage(message: Message): message is AssistantMessage {
  return message.role === 'assistant'
}

/**
 * Gets model information including context limits for the session's model.
 * Extracts model info from the latest user message (for model ID) or assistant message (for provider/model).
 */
export function useModelInfo(messages: Message[]): ModelInfoResult {
  const { client } = useOpenCode()
  const { currentProject, projects, selectedProjectIds } = useProject()

  const activeProject = useMemo(
    () => getActiveProject({ currentProject, projects, selectedProjectIds }),
    [currentProject, projects, selectedProjectIds],
  )

  const [limits, setLimits] = useState<Record<string, ModelLimit>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Get model from messages - try user message first, then assistant
  const latestModel = useMemo(() => {
    // Try user messages first (they have the model that was selected for the prompt)
    const userMessages = messages.filter(isUserMessage)
    if (userMessages.length > 0) {
      const latest = userMessages[userMessages.length - 1]
      if (latest?.model) {
        return { providerID: latest.model.providerID, modelID: latest.model.modelID }
      }
    }

    // Fall back to assistant messages (they have providerID and modelID directly)
    const assistantMessages = messages.filter(isAssistantMessage)
    if (assistantMessages.length > 0) {
      const latest = assistantMessages[assistantMessages.length - 1]
      if (latest?.providerID && latest?.modelID) {
        return { providerID: latest.providerID, modelID: latest.modelID }
      }
    }

    return null
  }, [messages])

  // Fetch model limits from providers
  useEffect(() => {
    if (!client || !activeProject) return

    const fetchLimits = async () => {
      setIsLoading(true)
      try {
        const result = await client.provider.list(
          { directory: activeProject.worktree },
          { throwOnError: true },
        )

        const providerData = result.data
        if (!providerData) return

        const modelLimits: Record<string, ModelLimit> = {}

        for (const provider of providerData.all ?? []) {
          for (const [modelId, modelData] of Object.entries(provider.models)) {
            const key = `${provider.id}/${modelId}`
            if (modelData.limit) {
              modelLimits[key] = {
                context: modelData.limit.context,
                output: modelData.limit.output,
              }
            }
          }
        }

        setLimits(modelLimits)
      } catch (err) {
        console.error('Failed to fetch model limits:', err)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchLimits()
  }, [client, activeProject])

  const modelKey = latestModel ? `${latestModel.providerID}/${latestModel.modelID}` : null
  const modelLimits = modelKey ? limits[modelKey] : null

  return {
    modelId: latestModel?.modelID ?? null,
    providerId: latestModel?.providerID ?? null,
    contextLimit: modelLimits?.context ?? null,
    outputLimit: modelLimits?.output ?? null,
    isLoading,
  }
}
