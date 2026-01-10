'use client'

import { memo } from 'react'

import { Markdown } from '@/components/ui/markdown'
import { StreamingMarkdown } from '@/components/ui/streaming-markdown'
import type { TextPart } from '@/lib/opencode'

interface TextPartRendererProps {
  part: TextPart
  /** Whether this part belongs to an assistant message (enables streaming cursor) */
  isAssistant?: boolean
}

export const TextPartRenderer = memo(function TextPartRenderer({
  part,
  isAssistant = false,
}: TextPartRendererProps) {
  if (part.ignored) {
    return null
  }

  // Only show streaming cursor for assistant messages that are actively streaming
  const isStreaming = isAssistant && !part.time?.end
  const isEmpty = !part.text.trim()

  if (isEmpty && !isStreaming) {
    return null
  }

  const markdownClassName = part.synthetic ? 'text-muted-foreground italic' : undefined

  return isStreaming ? (
    <StreamingMarkdown content={part.text} isStreaming className={markdownClassName} />
  ) : (
    <Markdown content={part.text} className={markdownClassName} />
  )
})
