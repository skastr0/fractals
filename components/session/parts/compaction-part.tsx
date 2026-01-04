'use client'

import { Minimize2 } from 'lucide-react'
import { memo } from 'react'
import type { Part } from '@/lib/opencode'

type CompactionPart = Extract<Part, { type: 'compaction' }>

interface CompactionPartRendererProps {
  part: CompactionPart
}

export const CompactionPartRenderer = memo(function CompactionPartRenderer({
  part,
}: CompactionPartRendererProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
      <Minimize2 className="h-3.5 w-3.5" />
      <span>Messages compacted</span>
      {part.auto ? (
        <span className="rounded bg-secondary/60 px-1.5 py-0.5 text-[10px]">auto</span>
      ) : null}
    </div>
  )
})
