'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  buildCommandPaletteSections,
  buildCommandRegistry,
  filterCommandPaletteSections,
  flattenCommandPaletteSections,
  type CommandPaletteEntry,
  type CommandPaletteSection,
} from '@/lib/commands'
import { useCommands } from '@/hooks/useCommands'
import type { LocalCommandDefinition, SdkCommandDefinition } from '@/types'

const RECENT_COMMANDS_KEY = 'opencode-tree-ui:recent-commands'
const MAX_RECENT_COMMANDS = 10

const normalizeCommandId = (value: string): string => value.trim().toLowerCase()

const loadRecentCommandIds = (): string[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(RECENT_COMMANDS_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value) => typeof value === 'string').slice(0, MAX_RECENT_COMMANDS)
  } catch {
    return []
  }
}

const saveRecentCommandIds = (ids: string[]): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(ids.slice(0, MAX_RECENT_COMMANDS)))
  } catch {
    // Ignore storage errors
  }
}

const addRecentCommandId = (id: string, current: string[]): string[] => {
  const normalized = normalizeCommandId(id)
  if (!normalized) return current
  const filtered = current.filter((commandId) => commandId !== normalized)
  return [normalized, ...filtered].slice(0, MAX_RECENT_COMMANDS)
}

export interface UseCommandPaletteDataOptions {
  localCommands: LocalCommandDefinition[]
  query: string
}

export interface UseCommandPaletteDataResult {
  sections: CommandPaletteSection[]
  filteredSections: CommandPaletteSection[]
  filteredEntries: CommandPaletteEntry[]
  isLoading: boolean
  error: string | null
  registerRecent: (commandId: string) => void
}

export function useCommandPaletteData({
  localCommands,
  query,
}: UseCommandPaletteDataOptions): UseCommandPaletteDataResult {
  const { commands, isLoading, error } = useCommands()
  const sdkCommands = useMemo(
    () => commands.filter((command): command is SdkCommandDefinition => command.source === 'sdk'),
    [commands],
  )

  const registry = useMemo(
    () =>
      buildCommandRegistry({
        localCommands,
        sdkCommands,
      }),
    [localCommands, sdkCommands],
  )

  const [recentCommandIds, setRecentCommandIds] = useState<string[]>([])

  useEffect(() => {
    setRecentCommandIds(loadRecentCommandIds())
  }, [])

  const registerRecent = useCallback((commandId: string) => {
    setRecentCommandIds((current) => {
      const updated = addRecentCommandId(commandId, current)
      saveRecentCommandIds(updated)
      return updated
    })
  }, [])

  const sections = useMemo(
    () => buildCommandPaletteSections({ registry, recentIds: recentCommandIds }),
    [recentCommandIds, registry],
  )

  const filteredSections = useMemo(
    () => filterCommandPaletteSections(sections, query),
    [query, sections],
  )

  const filteredEntries = useMemo(
    () => flattenCommandPaletteSections(filteredSections),
    [filteredSections],
  )

  return {
    sections,
    filteredSections,
    filteredEntries,
    isLoading,
    error,
    registerRecent,
  }
}
