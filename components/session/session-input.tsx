'use client'

import { Bot, Cpu, Paperclip, Send, Square, X } from 'lucide-react'
import {
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { Button } from '@/components/ui/button'
import { Select, SelectItem } from '@/components/ui/select'
import { useSession } from '@/hooks/useSession'
import type { SendMessageOptions } from '@/lib/opencode/sessions'
import { cn } from '@/lib/utils'

interface SessionInputProps {
  sessionId: string
}

type AgentOption = {
  id: string
  label: string
  value?: string
}

type ModelOption = {
  id: string
  label: string
  value?: SendMessageOptions['model']
}

const DEFAULT_OPTION: AgentOption = { id: 'default', label: 'Default' }
const DEFAULT_MODEL_OPTION: ModelOption = { id: 'default', label: 'Default' }

export const SessionInput = memo(function SessionInput({ sessionId }: SessionInputProps) {
  const { messages, sendMessage, abort, isWorking } = useSession(sessionId)
  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [selectedAgentKey, setSelectedAgentKey] = useState(DEFAULT_OPTION.id)
  const [selectedModelKey, setSelectedModelKey] = useState(DEFAULT_MODEL_OPTION.id)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const agentOptions = useMemo<AgentOption[]>(() => {
    const options = new Set<string>()
    for (const message of messages) {
      if (message.agent) {
        options.add(message.agent)
      }
    }

    return [
      DEFAULT_OPTION,
      ...Array.from(options)
        .sort()
        .map((agent) => ({ id: agent, label: agent, value: agent })),
    ]
  }, [messages])

  const modelOptions = useMemo<ModelOption[]>(() => {
    const seen = new Map<string, ModelOption>()

    for (const message of messages) {
      if (message.role === 'user') {
        const key = `${message.model.providerID}/${message.model.modelID}`
        seen.set(key, {
          id: key,
          label: key,
          value: { providerID: message.model.providerID, modelID: message.model.modelID },
        })
      }

      if (message.role === 'assistant') {
        const key = `${message.providerID}/${message.modelID}`
        seen.set(key, {
          id: key,
          label: key,
          value: { providerID: message.providerID, modelID: message.modelID },
        })
      }
    }

    return [
      DEFAULT_MODEL_OPTION,
      ...Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label)),
    ]
  }, [messages])

  const selectedAgent = agentOptions.find((option) => option.id === selectedAgentKey)?.value
  const selectedModel = modelOptions.find((option) => option.id === selectedModelKey)?.value

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    const minHeight = prompt.length === 0 ? 24 : 24
    textarea.style.height = 'auto'
    const nextHeight = Math.min(textarea.scrollHeight, 200)
    textarea.style.height = `${Math.max(nextHeight, minHeight)}px`
  }, [prompt])

  const handleSubmit = useCallback(async () => {
    if (isWorking) {
      return
    }

    const trimmed = prompt.trim()
    if (!trimmed && files.length === 0) {
      return
    }

    const attachments = await Promise.all(files.map(fileToAttachment))

    await sendMessage(trimmed, {
      files: attachments,
      agent: selectedAgent,
      model: selectedModel,
    })

    setPrompt('')
    setFiles([])
  }, [files, isWorking, prompt, selectedAgent, selectedModel, sendMessage])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        void handleSubmit()
      }
    },
    [handleSubmit],
  )

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      if (isWorking) {
        return
      }

      const items = Array.from(event.clipboardData.items)
      const pastedImages = items
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file))

      if (pastedImages.length === 0) {
        return
      }

      event.preventDefault()
      setFiles((prev) => [...prev, ...pastedImages])
    },
    [isWorking],
  )

  const handleFileSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? [])
    if (nextFiles.length === 0) {
      return
    }

    setFiles((prev) => [...prev, ...nextFiles])
    event.target.value = ''
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
  }, [])

  const canSend = !isWorking && (prompt.trim().length > 0 || files.length > 0)

  return (
    <div className="rounded-lg border border-border bg-background shadow-lg">
      {files.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-b border-border p-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground"
            >
              <span className="max-w-[160px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-error"
                aria-label="Remove file"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="p-3">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Send a message..."
          disabled={isWorking}
          rows={1}
          className={cn(
            'w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none',
          )}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <label
            className={cn(
              'cursor-pointer text-muted-foreground transition-colors hover:text-foreground',
              isWorking ? 'cursor-not-allowed opacity-50' : '',
            )}
          >
            <Paperclip className="h-4 w-4" />
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={isWorking}
            />
          </label>

          <Select
            aria-label="Select agent"
            items={agentOptions}
            selectedKey={selectedAgentKey}
            onSelectionChange={(key) => setSelectedAgentKey(String(key))}
            isDisabled={isWorking || agentOptions.length <= 1}
            className="min-w-[140px]"
          >
            {(item) => (
              <SelectItem id={item.id} textValue={item.label}>
                <div className="flex items-center gap-2">
                  <Bot className="h-3 w-3" />
                  <span className="text-sm">{item.label}</span>
                </div>
              </SelectItem>
            )}
          </Select>

          <Select
            aria-label="Select model"
            items={modelOptions}
            selectedKey={selectedModelKey}
            onSelectionChange={(key) => setSelectedModelKey(String(key))}
            isDisabled={isWorking || modelOptions.length <= 1}
            className="min-w-[160px]"
          >
            {(item) => (
              <SelectItem id={item.id} textValue={item.label}>
                <div className="flex items-center gap-2">
                  <Cpu className="h-3 w-3" />
                  <span className="text-sm">{item.label}</span>
                </div>
              </SelectItem>
            )}
          </Select>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{prompt.length}</span>
          {isWorking ? (
            <Button variant="destructive" size="sm" onPress={abort}>
              <Square className="h-4 w-4" />
              Stop
            </Button>
          ) : (
            <Button size="sm" onPress={() => void handleSubmit()} isDisabled={!canSend}>
              <Send className="h-4 w-4" />
              Send
            </Button>
          )}
        </div>
      </div>
    </div>
  )
})

async function fileToAttachment(file: File) {
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
