'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useOpenCode } from '@/context/OpenCodeProvider'
import { getActiveProject, useProject } from '@/context/ProjectProvider'
import { commandService, formatCommandArguments } from '@/lib/opencode'
import { parseSessionKey } from '@/lib/utils'
import type { CommandDefinition } from '@/types'

export interface ExecuteCommandOptions {
  command: CommandDefinition
  args?: string[]
  sessionKey?: string
  sessionId?: string
  directory?: string
}

export interface CommandExecutionResult {
  status: 'success' | 'error'
  error?: string
}

export interface UseCommandExecutorResult {
  executeCommand: (options: ExecuteCommandOptions) => Promise<CommandExecutionResult>
  isExecuting: boolean
  error: string | null
}

const resolveSessionContext = (
  options: ExecuteCommandOptions,
  fallbackDirectory: string | null,
): { sessionId: string | null; directory: string | null } => {
  const parsed = options.sessionKey ? parseSessionKey(options.sessionKey) : null
  const sessionId =
    options.sessionId ??
    parsed?.sessionId ??
    (options.sessionKey && !parsed ? options.sessionKey : null)
  const directory = options.directory ?? parsed?.directory ?? fallbackDirectory
  return { sessionId, directory }
}

const buildCommandInput = (name: string, args: string[]): string => {
  const formattedArgs = formatCommandArguments(args)
  return formattedArgs ? `/${name} ${formattedArgs}` : `/${name}`
}

export function useCommandExecutor(): UseCommandExecutorResult {
  const { client } = useOpenCode()
  const { currentProject, projects, selectedProjectIds } = useProject()

  const activeProject = useMemo(
    () => getActiveProject({ currentProject, projects, selectedProjectIds }),
    [currentProject, projects, selectedProjectIds],
  )

  const defaultDirectory = activeProject?.worktree ?? null

  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const executeCommand = useCallback(
    async (options: ExecuteCommandOptions): Promise<CommandExecutionResult> => {
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      setIsExecuting(true)
      setError(null)

      try {
        if (options.command.source === 'local') {
          await options.command.action()
          return { status: 'success' }
        }

        if (!client) {
          throw new Error('Connect to OpenCode to run commands.')
        }

        const { sessionId, directory } = resolveSessionContext(options, defaultDirectory)

        if (!directory) {
          throw new Error('Select a project to run commands.')
        }

        const args = options.args ?? []

        if (sessionId) {
          await commandService.executeSession({
            sessionId,
            command: options.command.name,
            args,
            directory,
          })
        } else {
          const commandInput = buildCommandInput(options.command.name, args)
          await commandService.execute({ command: commandInput, directory })
        }

        return { status: 'success' }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to execute command'
        if (requestId === requestIdRef.current) {
          setError(message)
        }
        return { status: 'error', error: message }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsExecuting(false)
        }
      }
    },
    [client, defaultDirectory],
  )

  return {
    executeCommand,
    isExecuting,
    error,
  }
}
