'use client'

import { Flag, FlagTriangleRight } from 'lucide-react'
import { memo } from 'react'
import type { Part } from '@/lib/opencode'

type StepPart = Extract<Part, { type: 'step-start' | 'step-finish' }>

interface StepPartRendererProps {
  part: StepPart
}

export const StepPartRenderer = memo(function StepPartRenderer({ part }: StepPartRendererProps) {
  if (part.type === 'step-start') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
        <FlagTriangleRight className="h-3 w-3" />
        <span>Step started</span>
      </div>
    )
  }

  const tokenSummary = `in ${part.tokens.input} / out ${part.tokens.output}`
  const cost = part.cost > 0 ? `$${part.cost.toFixed(4)}` : null

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
      <Flag className="h-3 w-3" />
      <span>Step finished</span>
      <span className="ml-auto font-mono">{part.reason}</span>
      <span className="text-muted-foreground">{tokenSummary}</span>
      {cost ? <span className="text-muted-foreground">{cost}</span> : null}
    </div>
  )
})
