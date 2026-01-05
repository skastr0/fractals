'use client'

import { Brain, ChevronDown, ChevronRight } from 'lucide-react'
import { memo, useState } from 'react'

import { Markdown } from '@/components/ui/markdown'
import type { ReasoningPart } from '@/lib/opencode'
import { formatDuration } from '@/lib/utils/date'

interface ReasoningPartRendererProps {
  part: ReasoningPart
}

const extractSummary = (text: string): string => {
  const firstLine = text.split('\n')[0]?.trim() ?? ''
  if (firstLine.length <= 80) {
    return firstLine
  }
  return `${firstLine.slice(0, 77)}...`
}

export const ReasoningPartRenderer = memo(function ReasoningPartRenderer({
  part,
}: ReasoningPartRendererProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isStreaming = !part.time?.end
  const duration = part.time.end ? formatDuration(part.time.end - part.time.start) : null
  const summary = extractSummary(part.text)

  return (
    <div className="overflow-hidden rounded-lg border border-primary/20 bg-primary/5">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10"
      >
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Brain className="h-4 w-4 text-primary" />
        <span className="text-xs italic text-primary">Thinking:</span>
        {!isExpanded && summary ? (
          <span className="flex-1 truncate text-left text-xs text-muted-foreground">{summary}</span>
        ) : null}
        <span className="ml-auto flex items-center gap-2 text-xs">
          {isStreaming ? <span className="animate-pulse text-primary">Thinking...</span> : null}
          {duration ? <span className="text-muted-foreground">{duration}</span> : null}
        </span>
      </button>

      {isExpanded ? (
        <div className="border-t border-primary/20 bg-background/50 p-3">
          <div className="text-sm italic text-muted-foreground">
            <Markdown content={part.text} />
          </div>
        </div>
      ) : null}
    </div>
  )
})
