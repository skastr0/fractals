'use client'

import { GitBranch } from 'lucide-react'
import { memo } from 'react'
import type { Part } from '@/lib/opencode'

type SubtaskPart = Extract<Part, { type: 'subtask' }>

interface SubtaskPartRendererProps {
  part: SubtaskPart
}

export const SubtaskPartRenderer = memo(function SubtaskPartRenderer({
  part,
}: SubtaskPartRendererProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/10">
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <GitBranch className="h-4 w-4 text-amber-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-amber-500">Subtask</span>
            <span className="rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] text-secondary-foreground">
              {part.agent}
            </span>
            {part.command ? (
              <span className="font-mono text-xs text-muted-foreground">{part.command}</span>
            ) : null}
          </div>
          <p className="text-sm text-foreground">{part.description}</p>
        </div>
      </div>
      {part.prompt ? (
        <div className="border-t border-amber-500/20 bg-background/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">{part.prompt}</p>
        </div>
      ) : null}
    </div>
  )
})
