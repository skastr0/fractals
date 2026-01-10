'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOpenCode } from '@/context/OpenCodeProvider'
import { getActiveProject, useProject } from '@/context/ProjectProvider'
import {
  buildCommandRegistry,
  type CommandCollisionStrategy,
  createLocalCommandRegistry,
  type LocalCommandRegistryOptions,
} from '@/lib/commands'
import { commandService } from '@/lib/opencode'
import type { CommandDefinition, LocalCommandDefinition, SdkCommandDefinition } from '@/types'

export interface UseCommandsOptions {
  localCommands?: LocalCommandDefinition[]
  localRegistryOptions?: LocalCommandRegistryOptions
  collisionStrategy?: CommandCollisionStrategy
  onCollision?: (name: string, winner: CommandDefinition, loser: CommandDefinition) => void
}

export interface UseCommandsResult {
  commands: CommandDefinition[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useCommands(options: UseCommandsOptions = {}): UseCommandsResult {
  const { client, health, url } = useOpenCode()
  const { currentProject, projects, selectedProjectIds } = useProject()
  const {
    localCommands: overrideLocalCommands,
    localRegistryOptions,
    collisionStrategy,
    onCollision,
  } = options

  const activeProject = useMemo(
    () => getActiveProject({ currentProject, projects, selectedProjectIds }),
    [currentProject, projects, selectedProjectIds],
  )

  const directory = activeProject?.worktree ?? null
  const serverKey = (health?.url ?? url ?? '').trim() || 'default'
  const cacheKey = directory ? `${serverKey}::${directory}` : null

  const [sdkCommands, setSdkCommands] = useState<SdkCommandDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cacheRef = useRef(new Map<string, SdkCommandDefinition[]>())
  const requestIdRef = useRef(0)

  const localCommands = useMemo(() => {
    if (overrideLocalCommands) {
      return overrideLocalCommands
    }

    if (!localRegistryOptions) {
      return []
    }

    return createLocalCommandRegistry(localRegistryOptions)
  }, [localRegistryOptions, overrideLocalCommands])

  const fetchCommands = useCallback(
    async (force = false) => {
      if (!client || !directory) {
        return
      }

      if (!force && cacheKey) {
        const cached = cacheRef.current.get(cacheKey)
        if (cached) {
          setSdkCommands(cached)
        }
      }

      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId

      setIsLoading(true)
      setError(null)

      try {
        const fetched = await commandService.list({ directory })

        if (requestId !== requestIdRef.current) {
          return
        }

        if (cacheKey) {
          cacheRef.current.set(cacheKey, fetched)
        }
        setSdkCommands(fetched)
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch commands')
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [cacheKey, client, directory],
  )

  useEffect(() => {
    if (!client) {
      setSdkCommands([])
      setIsLoading(false)
      setError(null)
      return
    }

    if (!directory) {
      setSdkCommands([])
      setIsLoading(false)
      setError('Select a project to load commands.')
      return
    }

    if (cacheKey) {
      const cached = cacheRef.current.get(cacheKey)
      if (cached) {
        setSdkCommands(cached)
      }
    }

    void fetchCommands()
  }, [cacheKey, client, directory, fetchCommands])

  const refresh = useCallback(async () => {
    await fetchCommands(true)
  }, [fetchCommands])

  const registry = useMemo(
    () =>
      buildCommandRegistry({
        localCommands,
        sdkCommands,
        collisionStrategy,
        onCollision,
      }),
    [collisionStrategy, localCommands, onCollision, sdkCommands],
  )

  const commands = useMemo(() => registry.entries.map((entry) => entry.command), [registry.entries])

  return {
    commands,
    isLoading,
    error,
    refresh,
  }
}
