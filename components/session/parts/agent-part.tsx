'use client'

import { Bot } from 'lucide-react'
import { memo } from 'react'
import type { AgentPart } from '@/lib/opencode'

interface AgentPartRendererProps {
  part: AgentPart
}

export const AgentPartRenderer = memo(function AgentPartRenderer({ part }: AgentPartRendererProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-2 py-1 text-xs text-primary">
      <Bot className="h-3 w-3" />
      <span>Agent: {part.name}</span>
    </div>
  )
})
