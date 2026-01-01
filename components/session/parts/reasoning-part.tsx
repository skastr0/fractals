'use client'

import { Brain, ChevronDown, ChevronRight } from 'lucide-react'
import { memo, useState } from 'react'

import { Markdown } from '@/components/ui/markdown'
import type { ReasoningPart } from '@/lib/opencode'
import { formatDuration } from '@/lib/utils/date'

import { TypewriterEffect } from '../typewriter-effect'

interface ReasoningPartRendererProps {
  part: ReasoningPart
}

export const ReasoningPartRenderer = memo(function ReasoningPartRenderer({
  part,
}: ReasoningPartRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isStreaming = !part.time?.end
  const duration = part.time.end ? formatDuration(part.time.end - part.time.start) : null

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40"
      >
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Brain className="h-4 w-4" />
        <span>Reasoning</span>
        <span className="ml-auto flex items-center gap-2 text-xs">
          {isStreaming ? <span className="text-primary">Streaming</span> : null}
          {duration ? <span className="text-muted-foreground">{duration}</span> : null}
        </span>
      </button>

      {isExpanded ? (
        <div className="border-t border-border bg-background p-3">
          <TypewriterEffect
            text={part.text}
            isStreaming={isStreaming}
            className="text-sm text-muted-foreground"
            render={(value) => <Markdown content={value} />}
          />
        </div>
      ) : null}
    </div>
  )
})
