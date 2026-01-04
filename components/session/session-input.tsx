'use client'

import { ChevronDown, Loader2, Paperclip, Send, Sparkles, X } from 'lucide-react'
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
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
import { useSession } from '@/hooks/useSession'
import { useSessionOptions } from '@/hooks/useSessionOptions'
import { useSessionStatus } from '@/hooks/useSessionStatus'
import type { SessionFileAttachment } from '@/lib/opencode/sessions'

import { ModelPicker } from './model-picker'

interface SessionInputProps {
  sessionKey: string
  autoFocus?: boolean
}

export function SessionInput({ sessionKey, autoFocus }: SessionInputProps) {
  const { messages, sendMessage, isWorking } = useSession(sessionKey)
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

  const [input, setInput] = useState('')
  const [files, setFiles] = useState<SessionFileAttachment[]>([])
  const [isSending, setIsSending] = useState(false)
  const [initializedForSession, setInitializedForSession] = useState<string | null>(null)
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

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    if (selectedFiles.length === 0) {
      return
    }

    const newFiles = await Promise.all(selectedFiles.map(fileToAttachment))
    setFiles((prev) => [...prev, ...newFiles])
    event.target.value = ''
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
  }, [])

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed && files.length === 0) {
      return
    }
    if (isSending) {
      return
    }

    setIsSending(true)
    try {
      const promptParams = getPromptParams()
      await sendMessage(trimmed, {
        files: files.length > 0 ? files : undefined,
        ...promptParams,
      })
      setInput('')
      setFiles([])
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }, [input, files, isSending, sendMessage, getPromptParams])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        void handleSubmit()
      }
    },
    [handleSubmit],
  )

  const isDisabled = isSending || isWorking

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
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            disabled={isDisabled}
            rows={1}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
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
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
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
