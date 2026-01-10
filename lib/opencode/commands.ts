import type { SdkCommandDefinition } from '@/types'
import { getDefaultClient, type Command as SdkCommand } from './client'
import { wrapSdkError } from './errors'

export interface ListCommandsOptions {
  directory?: string
}

export interface ExecuteCommandOptions {
  command: string
  directory?: string
}

export interface ExecuteSessionCommandOptions {
  sessionId: string
  command: string
  args?: string[]
  directory?: string
}

const withSdkError = async <T>(action: () => Promise<T>): Promise<T> => {
  try {
    return await action()
  } catch (error) {
    throw wrapSdkError(error)
  }
}

const mapSdkCommand = (command: SdkCommand): SdkCommandDefinition => ({
  ...command,
  source: 'sdk',
  keywords: command.hints,
})

const escapeCommandArgument = (value: string): string => {
  if (!/[\s"]/u.test(value)) {
    return value
  }
  const escaped = value.replace(/["\\]/gu, '\\$&')
  return `"${escaped}"`
}

export const formatCommandArguments = (args: string[] = []): string => {
  return args.map(escapeCommandArgument).join(' ')
}

export const commandService = {
  async list(options: ListCommandsOptions = {}): Promise<SdkCommandDefinition[]> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      const result = await client.command.list(
        options.directory ? { directory: options.directory } : undefined,
        { throwOnError: true },
      )
      return result.data.map(mapSdkCommand)
    })
  },

  async executeSession(options: ExecuteSessionCommandOptions): Promise<boolean> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      await client.session.command(
        {
          sessionID: options.sessionId,
          command: options.command,
          arguments: formatCommandArguments(options.args ?? []),
          ...(options.directory ? { directory: options.directory } : {}),
        },
        { throwOnError: true },
      )
      return true
    })
  },

  async execute(options: ExecuteCommandOptions): Promise<boolean> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      const result = await client.tui.executeCommand(
        {
          command: options.command,
          ...(options.directory ? { directory: options.directory } : {}),
        },
        { throwOnError: true },
      )
      return result.data
    })
  },
}
