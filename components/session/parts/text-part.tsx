'use client'

import { memo } from 'react'

import { Markdown } from '@/components/ui/markdown'
import type { TextPart } from '@/lib/opencode'
import { cn } from '@/lib/utils'

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

  return (
    <div
      className={cn(
        'prose prose-sm prose-invert max-w-none leading-relaxed',
        part.synthetic ? 'text-muted-foreground italic' : 'text-foreground',
      )}
    >
      <Markdown content={part.text} />
      {isStreaming && (
        <span
          className="ml-1 inline-block h-4 w-0.5 bg-primary"
          style={{ animation: 'blink 1s step-start infinite' }}
        />
      )}
    </div>
  )
})
