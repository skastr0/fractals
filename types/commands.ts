import type { Command as SdkCommand } from '@/lib/opencode/client'

export type CommandSource = 'sdk' | 'local'

export interface CommandMetadata {
  category?: string
  icon?: string
  shortcut?: string
  keywords?: string[]
}

export type SdkCommandDefinition = SdkCommand &
  CommandMetadata & {
    source: 'sdk'
  }

export interface LocalCommandDefinition extends CommandMetadata {
  source: 'local'
  id: string
  label: string
  description?: string
  action: () => void | Promise<void>
}

export type CommandDefinition = SdkCommandDefinition | LocalCommandDefinition
