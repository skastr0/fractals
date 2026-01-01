'use client'

import { FileCode } from 'lucide-react'
import { memo } from 'react'
import type { PatchPart } from '@/lib/opencode'

interface PatchPartRendererProps {
  part: PatchPart
}

export const PatchPartRenderer = memo(function PatchPartRenderer({ part }: PatchPartRendererProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <FileCode className="h-4 w-4" />
        <span>Patch applied</span>
        <span className="font-mono">{part.hash.slice(0, 8)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {part.files.map((file) => (
          <span
            key={file}
            className="rounded bg-secondary px-2 py-1 text-xs font-mono text-secondary-foreground"
          >
            {file}
          </span>
        ))}
      </div>
    </div>
  )
})
