'use client'

import { Loader2, Paperclip, Send, X } from 'lucide-react'
import { type ChangeEvent, type KeyboardEvent, useCallback, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/useSession'
import type { SessionFileAttachment } from '@/lib/opencode/sessions'

interface SessionInputProps {
  sessionId: string
}

export function SessionInput({ sessionId }: SessionInputProps) {
  const { sendMessage, isWorking } = useSession(sessionId)
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<SessionFileAttachment[]>([])
  const [isSending, setIsSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      await sendMessage(trimmed, { files: files.length > 0 ? files : undefined })
      setInput('')
      setFiles([])
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }, [input, files, isSending, sendMessage])

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

  return (
    <div className="space-y-2">
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
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
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
