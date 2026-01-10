'use client'

import { memo } from 'react'

import { StreamingMarkdown } from '@/components/ui/streaming-markdown'
import type { ReasoningPart } from '@/lib/opencode'
import { formatDuration } from '@/lib/utils/date'

interface ChainOfThoughtProps {
  part: ReasoningPart
}

// Simplified content-only display (no collapsible wrapper - parent PartItem handles that)
export const ChainOfThought = memo(function ChainOfThought({ part }: ChainOfThoughtProps) {
  const isStreaming = !part.time?.end
  const duration = part.time.end ? formatDuration(part.time.end - part.time.start) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isStreaming ? <span className="animate-pulse text-primary">Thinking...</span> : null}
        {duration ? <span>{duration}</span> : null}
      </div>
      <div className="text-sm italic text-muted-foreground">
        <StreamingMarkdown content={part.text} isStreaming={isStreaming} />
      </div>
    </div>
  )
})
