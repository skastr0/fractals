import {
  fuzzyMatch,
  SESSION_TIME_FILTERS,
  type SessionTimeFilter,
} from '@/lib/graph/session-filter'
import type {
  CommandDefinition,
  CommandSource,
  LocalCommandDefinition,
  SdkCommandDefinition,
} from '@/types'

export type CommandCollisionStrategy = 'prefer-local' | 'prefer-sdk'

export interface LocalCommandRegistryOptions {
  onNewSession: () => void
  onJumpToLatest?: () => void
  onClearSelection?: () => void
  onCloseMostRecentPane: () => void
  onSetFilterHours: (hours: number) => void
  timeFilters?: readonly SessionTimeFilter[]
}

export interface CommandRegistryEntry {
  id: string
  label: string
  description: string
  category: string
  keywords: string[]
  source: CommandSource
  icon?: string
  command: CommandDefinition
}

export interface CommandRegistry {
  entries: CommandRegistryEntry[]
  byName: Map<string, CommandRegistryEntry>
}

export interface CommandRegistryOptions {
  localCommands: LocalCommandDefinition[]
  sdkCommands: SdkCommandDefinition[]
  collisionStrategy?: CommandCollisionStrategy
  onCollision?: (name: string, winner: CommandDefinition, loser: CommandDefinition) => void
}

const DEFAULT_CATEGORY = 'General'

const normalizeText = (value: string): string => value.trim().toLowerCase()

const normalizeKeywords = (values: Array<string | undefined>): string[] => {
  const keywords = new Set<string>()
  for (const value of values) {
    if (!value) continue
    const normalized = normalizeText(value)
    if (normalized) {
      keywords.add(normalized)
    }
  }
  return Array.from(keywords)
}

const getCommandKey = (command: CommandDefinition): string => {
  return command.source === 'sdk' ? command.name : command.id
}

const getCommandLabel = (command: CommandDefinition): string => {
  return command.source === 'sdk' ? command.name : command.label
}

const getCommandDescription = (command: CommandDefinition): string => {
  return command.description?.trim() ?? ''
}

const getCommandCategory = (command: CommandDefinition): string => {
  return command.category?.trim() || DEFAULT_CATEGORY
}

const getCommandKeywords = (
  command: CommandDefinition,
  label: string,
  description: string,
  category: string,
): string[] => {
  return normalizeKeywords([...(command.keywords ?? []), label, description, category])
}

const toRegistryEntry = (command: CommandDefinition): CommandRegistryEntry => {
  const label = getCommandLabel(command)
  const description = getCommandDescription(command)
  const category = getCommandCategory(command)
  const keywords = getCommandKeywords(command, label, description, category)

  return {
    id: getCommandKey(command),
    label,
    description,
    category,
    keywords,
    source: command.source,
    icon: command.icon,
    command,
  }
}

export const buildCommandRegistry = ({
  localCommands,
  sdkCommands,
  collisionStrategy = 'prefer-local',
  onCollision,
}: CommandRegistryOptions): CommandRegistry => {
  const entries = new Map<string, CommandRegistryEntry>()
  const preferredSource: CommandSource = collisionStrategy === 'prefer-local' ? 'local' : 'sdk'

  const addCommand = (command: CommandDefinition) => {
    const entry = toRegistryEntry(command)
    const key = normalizeText(entry.id)
    const existing = entries.get(key)

    if (!existing) {
      entries.set(key, entry)
      return
    }

    if (existing.source === entry.source) {
      onCollision?.(entry.id, existing.command, entry.command)
      return
    }

    if (entry.source === preferredSource) {
      entries.set(key, entry)
      onCollision?.(entry.id, entry.command, existing.command)
      return
    }

    onCollision?.(entry.id, existing.command, entry.command)
  }

  for (const command of sdkCommands) {
    addCommand(command)
  }

  for (const command of localCommands) {
    addCommand(command)
  }

  return {
    entries: Array.from(entries.values()),
    byName: entries,
  }
}

export const getCommandByName = (
  registry: CommandRegistry,
  name: string,
): CommandRegistryEntry | undefined => {
  return registry.byName.get(normalizeText(name))
}

export const getCommandsByCategory = (
  registry: CommandRegistry,
  category: string,
): CommandRegistryEntry[] => {
  const normalized = normalizeText(category)
  if (!normalized) {
    return registry.entries
  }
  return registry.entries.filter((entry) => normalizeText(entry.category) === normalized)
}

export const filterCommandEntries = (
  entries: CommandRegistryEntry[],
  query: string,
): CommandRegistryEntry[] => {
  const normalized = normalizeText(query)
  if (!normalized) {
    return entries
  }

  return entries.filter((entry) => {
    if (normalizeText(entry.label).includes(normalized)) {
      return true
    }
    return entry.keywords.some((keyword) => keyword.includes(normalized))
  })
}

export const getPaletteCommands = (
  registry: CommandRegistry,
  query = '',
): CommandRegistryEntry[] => {
  return filterCommandEntries(registry.entries, query)
}

export type CommandPaletteSectionId = 'recent' | 'commands' | 'actions'

export interface CommandPaletteEntry {
  id: string
  label: string
  description: string
  category: string
  keywords: string[]
  shortcut?: string
  icon?: string
  source: CommandSource
  command: CommandDefinition
}

export interface CommandPaletteCategory {
  id: string
  label: string
  entries: CommandPaletteEntry[]
}

export interface CommandPaletteSection {
  id: CommandPaletteSectionId
  label: string
  categories: CommandPaletteCategory[]
}

export interface CommandPaletteSectionsOptions {
  registry: CommandRegistry
  recentIds?: string[]
}

const toPaletteEntry = (entry: CommandRegistryEntry): CommandPaletteEntry => {
  return {
    id: entry.id,
    label: entry.label,
    description: entry.description,
    category: entry.category,
    keywords: entry.keywords,
    shortcut: entry.command.shortcut,
    icon: entry.icon,
    source: entry.source,
    command: entry.command,
  }
}

const buildCategoryGroups = (entries: CommandPaletteEntry[]): CommandPaletteCategory[] => {
  const groups = new Map<string, CommandPaletteCategory>()

  for (const entry of entries) {
    const categoryLabel = entry.category || DEFAULT_CATEGORY
    const categoryId = normalizeText(categoryLabel)
    const existing = groups.get(categoryId)

    if (existing) {
      existing.entries.push(entry)
      continue
    }

    groups.set(categoryId, {
      id: categoryId,
      label: categoryLabel,
      entries: [entry],
    })
  }

  return Array.from(groups.values())
}

const compact = <T>(values: Array<T | null>): T[] => {
  return values.filter((value): value is T => value !== null)
}

const matchesPaletteQuery = (query: string, entry: CommandPaletteEntry): boolean => {
  const trimmed = query.trim()
  if (!trimmed) {
    return true
  }

  if (fuzzyMatch(trimmed, entry.label)) {
    return true
  }

  if (entry.description && fuzzyMatch(trimmed, entry.description)) {
    return true
  }

  return entry.keywords.some((keyword) => fuzzyMatch(trimmed, keyword))
}

export const buildCommandPaletteSections = ({
  registry,
  recentIds = [],
}: CommandPaletteSectionsOptions): CommandPaletteSection[] => {
  const paletteEntries = registry.entries.map(toPaletteEntry)
  const recentEntries = compact(
    recentIds.map((id) => {
      const entry = getCommandByName(registry, id)
      return entry ? toPaletteEntry(entry) : null
    }),
  )
  const recentIdsSet = new Set(recentEntries.map((entry) => normalizeText(entry.id)))

  const commandEntries = paletteEntries.filter(
    (entry) => entry.source === 'sdk' && !recentIdsSet.has(normalizeText(entry.id)),
  )
  const actionEntries = paletteEntries.filter(
    (entry) => entry.source === 'local' && !recentIdsSet.has(normalizeText(entry.id)),
  )

  return [
    {
      id: 'recent',
      label: 'Recent',
      categories: buildCategoryGroups(recentEntries),
    },
    {
      id: 'commands',
      label: 'Commands',
      categories: buildCategoryGroups(commandEntries),
    },
    {
      id: 'actions',
      label: 'Actions',
      categories: buildCategoryGroups(actionEntries),
    },
  ]
}

export const filterCommandPaletteSections = (
  sections: CommandPaletteSection[],
  query: string,
): CommandPaletteSection[] => {
  const trimmed = query.trim()
  if (!trimmed) {
    return sections
  }

  return compact(
    sections.map((section) => {
      const categories = compact(
        section.categories.map((category) => {
          const entries = category.entries.filter((entry) => matchesPaletteQuery(trimmed, entry))
          if (entries.length === 0) {
            return null
          }
          return { ...category, entries }
        }),
      )

      if (categories.length === 0) {
        return null
      }

      return { ...section, categories }
    }),
  )
}

export const flattenCommandPaletteSections = (
  sections: CommandPaletteSection[],
): CommandPaletteEntry[] => {
  const entries: CommandPaletteEntry[] = []

  for (const section of sections) {
    for (const category of section.categories) {
      entries.push(...category.entries)
    }
  }

  return entries
}

export const createLocalCommandRegistry = ({
  onNewSession,
  onJumpToLatest,
  onClearSelection,
  onCloseMostRecentPane,
  onSetFilterHours,
  timeFilters = SESSION_TIME_FILTERS,
}: LocalCommandRegistryOptions): LocalCommandDefinition[] => {
  const commands: LocalCommandDefinition[] = [
    {
      source: 'local',
      id: 'new-session',
      label: 'New session',
      description: 'Create a new session',
      category: 'Session',
      icon: 'plus',
      keywords: ['create', 'add', 'start'],
      action: onNewSession,
    },
  ]

  if (onJumpToLatest) {
    commands.push({
      source: 'local',
      id: 'jump-to-latest',
      label: 'Jump to latest session',
      description: 'Jump to the most recent session',
      category: 'Session',
      icon: 'zap',
      keywords: ['recent', 'newest', 'focus'],
      action: onJumpToLatest,
    })
  }

  if (onClearSelection) {
    commands.push({
      source: 'local',
      id: 'clear-selection',
      label: 'Clear selection',
      description: 'Clear the current selection',
      category: 'Selection',
      icon: 'mouse-pointer',
      keywords: ['deselect', 'unselect'],
      action: onClearSelection,
    })
  }

  commands.push({
    source: 'local',
    id: 'close-pane',
    label: 'Close most recent pane',
    description: 'Close the most recently opened pane',
    category: 'Pane',
    icon: 'x',
    keywords: ['close', 'hide', 'dismiss'],
    action: onCloseMostRecentPane,
  })

  for (const filter of timeFilters) {
    commands.push({
      source: 'local',
      id: `time-filter-${filter.hours}`,
      label: `Set time filter: ${filter.label}`,
      description: `Filter sessions updated within ${filter.label}`,
      category: 'Filter',
      icon: 'clock',
      keywords: ['time', 'filter', 'hours', filter.label.toLowerCase()],
      action: () => onSetFilterHours(filter.hours),
    })
  }

  return commands
}
