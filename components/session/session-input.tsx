'use client'

import { ChevronDown, ChevronUp, Paperclip, Send, Sparkles, X } from 'lucide-react'
import {
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Button as AriaButton,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from 'react-aria-components'

import { Button } from '@/components/ui/button'
import { SessionStatusBadge } from '@/components/ui/session-status-badge'
import { useCommandExecutor } from '@/hooks/useCommandExecutor'
import { useCommands } from '@/hooks/useCommands'
import { useSession } from '@/hooks/useSession'
import { useSessionOptions } from '@/hooks/useSessionOptions'
import { useSessionStatus } from '@/hooks/useSessionStatus'
import { parseCommandInput } from '@/lib/commands/parse-command'
import type { SessionFileAttachment } from '@/lib/opencode/sessions'
import type { CommandDefinition } from '@/types'

import { CommandAutocomplete } from './command-autocomplete'
import { ModelPicker } from './model-picker'

const normalizeCommandName = (value: string): string =>
  value.startsWith('/') ? value.slice(1) : value

const getCommandSearchValue = (command: CommandDefinition): string => {
  if (command.source === 'sdk') {
    return normalizeCommandName(command.name)
  }
  return command.label
}

const getCommandInsertValue = (command: CommandDefinition): string => {
  const value = command.source === 'sdk' ? command.name : command.id
  return normalizeCommandName(value)
}

const replaceCommandName = (value: string, commandName: string): string => {
  if (!value.trim().startsWith('/')) {
    return `/${commandName}`
  }

  return value.replace(/^(\s*\/)([^\s]*)/, `$1${commandName}`)
}

const ensureCommandSpacing = (value: string): string =>
  /^\s*\/\S+$/.test(value) ? `${value} ` : value

interface SessionInputProps {
  sessionKey: string
  autoFocus?: boolean
}

export function SessionInput({ sessionKey, autoFocus }: SessionInputProps) {
  const { messages, sendMessage } = useSession(sessionKey)
  const sessionStatus = useSessionStatus(sessionKey)
  const {
    agents,
    variants,
    recentModels,
    allModels,
    selectedModel,
    selectedAgent,
    selectedVariant,
    setModel,
    setAgent,
    cycleVariant,
    initializeFromMessage,
    getPromptParams,
    isLoading: isLoadingOptions,
  } = useSessionOptions()

  const { executeCommand, isExecuting: isCommandExecuting } = useCommandExecutor()
  const { commands, isLoading: isLoadingCommands, error: commandsError } = useCommands()

  const [input, setInput] = useState('')
  const [files, setFiles] = useState<SessionFileAttachment[]>([])
  const [initializedForSession, setInitializedForSession] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isCommandPopoverOpen, setIsCommandPopoverOpen] = useState(false)
  const [activeCommandIndex, setActiveCommandIndex] = useState(0)
  const [selectedCommand, setSelectedCommand] = useState<CommandDefinition | null>(null)
  const [commandError, setCommandError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Initialize model/agent from the session's last user message
  // Re-runs when sessionKey changes to pick up the new session's settings
  useEffect(() => {
    if (initializedForSession === sessionKey || messages.length === 0) return

    // Find the last user message (they have model/agent info)
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user') as
      | { model?: { providerID: string; modelID: string }; agent?: string }
      | undefined

    if (lastUserMessage) {
      initializeFromMessage(lastUserMessage.model, lastUserMessage.agent)
      setInitializedForSession(sessionKey)
    }
  }, [sessionKey, messages, initializedForSession, initializeFromMessage])

  // Focus the textarea when autoFocus is true (e.g., for new sessions)
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      // Use requestAnimationFrame to ensure the DOM is ready
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
      })
    }
  }, [autoFocus])

  const commandInput = useMemo(() => parseCommandInput(input), [input])
  const isCommandMode = commandInput.isCommand
  const commandQuery = commandInput.name ?? ''
  const normalizedCommandQuery = commandQuery.trim().toLowerCase()

  const filteredCommands = useMemo(() => {
    if (!isCommandMode) {
      return []
    }

    if (!normalizedCommandQuery) {
      return commands
    }

    return commands.filter((command) => {
      const searchValue = getCommandSearchValue(command).toLowerCase()
      if (searchValue.startsWith(normalizedCommandQuery)) {
        return true
      }
      if (searchValue.includes(normalizedCommandQuery)) {
        return true
      }
      return (command.keywords ?? []).some((keyword) =>
        keyword.toLowerCase().includes(normalizedCommandQuery),
      )
    })
  }, [commands, isCommandMode, normalizedCommandQuery])

  const commandEmptyMessage = useMemo(() => {
    if (commandsError) {
      return commandsError
    }

    return normalizedCommandQuery ? 'No commands found.' : 'No commands available.'
  }, [commandsError, normalizedCommandQuery])

  const selectedCommandHint = useMemo(() => {
    if (!selectedCommand || selectedCommand.source !== 'sdk') {
      return null
    }

    const template = selectedCommand.template?.trim()
    const templateHint = template && template !== selectedCommand.name ? template : null
    const hintValues = (selectedCommand.hints ?? []).map((hint) => hint.trim()).filter(Boolean)
    const combined = [templateHint, ...hintValues].filter(Boolean) as string[]

    return combined.length > 0 ? combined.join(' • ') : null
  }, [selectedCommand])

  const isCommandPopoverVisible = isCommandMode && isCommandPopoverOpen

  useEffect(() => {
    if (!isCommandMode) {
      setIsCommandPopoverOpen(false)
      setActiveCommandIndex(0)
      return
    }

    setIsCommandPopoverOpen(true)
  }, [isCommandMode])

  useEffect(() => {
    if (normalizedCommandQuery || normalizedCommandQuery === '') {
      setActiveCommandIndex(0)
    }
  }, [normalizedCommandQuery])

  useEffect(() => {
    if (filteredCommands.length === 0) {
      if (activeCommandIndex !== 0) {
        setActiveCommandIndex(0)
      }
      return
    }

    if (activeCommandIndex > filteredCommands.length - 1) {
      setActiveCommandIndex(filteredCommands.length - 1)
    }
  }, [activeCommandIndex, filteredCommands.length])

  useEffect(() => {
    if (!isCommandMode) {
      if (selectedCommand) {
        setSelectedCommand(null)
      }
      if (commandError) {
        setCommandError(null)
      }
      return
    }

    if (!selectedCommand) {
      return
    }

    const selectedName = getCommandInsertValue(selectedCommand).toLowerCase()
    const inputName = (commandInput.name ?? '').toLowerCase()

    if (selectedName !== inputName) {
      setSelectedCommand(null)
    }
  }, [commandError, commandInput.name, isCommandMode, selectedCommand])

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    if (selectedFiles.length === 0) {
      return
    }

    const newFiles = await Promise.all(selectedFiles.map(fileToAttachment))
    setFiles((prev) => [...prev, ...newFiles])
    event.target.value = ''
  }, [])

  const handlePaste = useCallback(async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = event.clipboardData
    if (!clipboardData) {
      return
    }

    const itemFiles = Array.from(clipboardData.items ?? [])
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file && file.size > 0))

    const pastedFiles =
      itemFiles.length > 0
        ? itemFiles
        : Array.from(clipboardData.files ?? []).filter((file) => file.size > 0)

    if (pastedFiles.length === 0) {
      return
    }

    const newFiles = await Promise.all(pastedFiles.map(fileToAttachment))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
  }, [])

  const handleMessageSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed && files.length === 0) {
      return
    }

    // Capture values before clearing
    const messageContent = trimmed
    const messageFiles = files.length > 0 ? [...files] : undefined
    const promptParams = getPromptParams()

    // Clear immediately - fire and forget
    setInput('')
    setFiles([])

    // Send in background - don't block the UI
    sendMessage(messageContent, {
      files: messageFiles,
      ...promptParams,
    }).catch((error) => {
      console.error('Failed to send message:', error)
      // Optionally: could restore input here, but for now just log
    })
  }, [input, files, sendMessage, getPromptParams])

  const handleCommandSubmit = useCallback(async () => {
    if (!selectedCommand || isCommandExecuting) {
      return
    }

    setCommandError(null)

    const result = await executeCommand({
      command: selectedCommand,
      args: commandInput.args,
      sessionKey,
    })

    if (result.status === 'success') {
      setInput('')
      setFiles([])
      setSelectedCommand(null)
      return
    }

    setCommandError(result.error ?? 'Failed to execute command')
  }, [commandInput.args, executeCommand, isCommandExecuting, selectedCommand, sessionKey])

  const handleSubmit = useCallback(async () => {
    if (isCommandMode) {
      if (!selectedCommand) {
        return
      }
      await handleCommandSubmit()
      return
    }

    handleMessageSubmit()
  }, [handleCommandSubmit, handleMessageSubmit, isCommandMode, selectedCommand])

  const handleCommandAutocomplete = useCallback((command: CommandDefinition) => {
    const commandName = getCommandInsertValue(command)

    setSelectedCommand(command)
    setCommandError(null)

    setInput((current) => {
      const updated = ensureCommandSpacing(replaceCommandName(current, commandName))

      requestAnimationFrame(() => {
        const textarea = textareaRef.current
        if (!textarea) {
          return
        }

        const commandStart = updated.indexOf(`/${commandName}`)
        const commandEnd =
          commandStart === -1 ? updated.length : commandStart + `/${commandName}`.length
        const nextPosition = updated.charAt(commandEnd) === ' ' ? commandEnd + 1 : commandEnd

        textarea.setSelectionRange(nextPosition, nextPosition)
        textarea.focus()
      })

      return updated
    })
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      const isPlainEnter =
        event.key === 'Enter' && !event.metaKey && !event.ctrlKey && !event.shiftKey

      // Cmd/Ctrl+Enter to submit
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        void handleSubmit()
        return
      }

      if (isPlainEnter) {
        if (isCommandMode) {
          if (selectedCommand) {
            event.preventDefault()
            void handleSubmit()
          }
          return
        }

        event.preventDefault()
        void handleSubmit()
        return
      }

      if (!isCommandPopoverVisible) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        setIsCommandPopoverOpen(false)
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (filteredCommands.length > 0) {
          setActiveCommandIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1))
        }
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (filteredCommands.length > 0) {
          setActiveCommandIndex((prev) => Math.max(prev - 1, 0))
        }
        return
      }

      if (event.key === 'Tab') {
        const selectedCommand = filteredCommands[activeCommandIndex]
        if (selectedCommand) {
          event.preventDefault()
          handleCommandAutocomplete(selectedCommand)
        }
      }
    },
    [
      activeCommandIndex,
      filteredCommands,
      handleCommandAutocomplete,
      handleSubmit,
      isCommandMode,
      isCommandPopoverVisible,
      selectedCommand,
    ],
  )

  // Input is never disabled - fire and forget, user can always type/submit
  const isDisabled = false

  // Determine if we should show the status indicator (when not idle)
  const statusType = typeof sessionStatus === 'string' ? sessionStatus : sessionStatus.type
  const showStatusIndicator = statusType !== 'idle'

  return (
    <div className="space-y-2">
      {/* Options Bar */}
      <div className="flex items-center gap-2 text-xs">
        {/* Session Status Indicator - shown when busy/retrying */}
        {showStatusIndicator ? <SessionStatusBadge status={sessionStatus} showLabel /> : null}

        {/* Model Selector with fuzzy search */}
        <ModelPicker
          recentModels={recentModels}
          allModels={allModels}
          selectedModel={selectedModel}
          onSelect={setModel}
          isDisabled={isDisabled || isLoadingOptions}
        />

        {/* Agent Selector - shows all non-subagent, non-hidden agents */}
        {agents.length > 0 ? (
          <Select
            aria-label="Select agent"
            selectedKey={selectedAgent?.name ?? null}
            onSelectionChange={(key) => {
              if (key === null) return
              const agent = agents.find((a) => a.name === key)
              setAgent(agent ?? null)
            }}
            isDisabled={isDisabled || isLoadingOptions}
            className="min-w-[100px]"
          >
            <AriaButton className="flex h-7 items-center gap-1.5 rounded border border-border bg-background px-2 text-xs text-foreground hover:bg-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50">
              <SelectValue className="flex-1 truncate text-left capitalize">
                {selectedAgent?.name ?? 'Agent'}
              </SelectValue>
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            </AriaButton>
            <Popover className="w-[--trigger-width] min-w-[200px] overflow-hidden rounded border border-border bg-background shadow-lg">
              <ListBox className="max-h-60 overflow-auto p-1">
                {agents.map((agent) => (
                  <ListBoxItem
                    key={agent.name}
                    id={agent.name}
                    textValue={agent.name}
                    className="flex cursor-pointer select-none flex-col gap-0.5 rounded px-2 py-1.5 text-xs outline-none hover:bg-accent focus:bg-accent data-[selected]:bg-primary/10"
                  >
                    <span className="font-medium capitalize">{agent.name}</span>
                    {agent.description ? (
                      <span className="line-clamp-2 text-[10px] text-muted-foreground">
                        {agent.description}
                      </span>
                    ) : null}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>
        ) : null}

        {/* Variant/Thinking Toggle */}
        {variants.length > 0 ? (
          <button
            type="button"
            onClick={cycleVariant}
            disabled={isDisabled}
            className="flex h-7 items-center gap-1 rounded border border-border bg-background px-2 text-xs text-foreground hover:bg-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50"
            title="Cycle thinking mode"
          >
            <Sparkles className="h-3 w-3 text-muted-foreground" />
            <span className="capitalize">{selectedVariant ?? 'Default'}</span>
          </button>
        ) : null}
      </div>

      {/* File attachments */}
      {files.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.filename ?? file.url}-${index}`}
              className="flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3" />
              <span className="max-w-[150px] truncate">{file.filename ?? 'Attachment'}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="ml-1 rounded-full p-0.5 hover:bg-secondary"
                aria-label={`Remove ${file.filename ?? 'attachment'}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              if (commandError) {
                setCommandError(null)
              }
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Send a message... (Enter to send, Shift+Enter for newline)"
            disabled={isDisabled}
            rows={isExpanded || isFocused ? 6 : 1}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm transition-all duration-150 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          {/* Expand/collapse toggle button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute bottom-2 right-2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={isExpanded ? 'Collapse input' : 'Expand input'}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          {isCommandPopoverVisible ? (
            <div className="absolute left-0 bottom-full z-50 mb-2 w-full">
              <CommandAutocomplete
                commands={filteredCommands}
                activeIndex={activeCommandIndex}
                onActiveChange={setActiveCommandIndex}
                onSelect={handleCommandAutocomplete}
                isLoading={isLoadingCommands}
                emptyMessage={commandEmptyMessage}
                popoverClassName="w-full"
              />
            </div>
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="ghost"
          size="icon"
          onPress={() => fileInputRef.current?.click()}
          isDisabled={isDisabled}
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          variant="primary"
          size="icon"
          onPress={() => void handleSubmit()}
          isDisabled={isDisabled || (!input.trim() && files.length === 0)}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {selectedCommandHint || commandError ? (
        <div className="space-y-1">
          {isCommandMode && selectedCommandHint ? (
            <p className="text-[10px] text-muted-foreground">{selectedCommandHint}</p>
          ) : null}
          {commandError ? <p className="text-xs text-error">{commandError}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

async function fileToAttachment(file: File): Promise<SessionFileAttachment> {
  const url = await fileToDataUrl(file)

  return {
    mime: file.type || 'application/octet-stream',
    url,
    filename: file.name,
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
