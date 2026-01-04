'use client'

import { Bot, ExternalLink } from 'lucide-react'
import { memo } from 'react'
import type { AgentPart } from '@/lib/opencode'

interface AgentPartRendererProps {
  part: AgentPart
}

export const AgentPartRenderer = memo(function AgentPartRenderer({ part }: AgentPartRendererProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-secondary/50 bg-secondary/20 px-3 py-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-foreground">Subagent</span>
        <span className="text-sm text-muted-foreground">{part.name}</span>
      </div>
      <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
    </div>
  )
})
