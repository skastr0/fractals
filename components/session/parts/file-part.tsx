'use client'

import { memo } from 'react'
import type { Part } from '@/lib/opencode'

type FilePart = Extract<Part, { type: 'file' }>

interface FilePartRendererProps {
  part: FilePart
}

/**
 * FilePartRenderer - Expanded view for file parts
 *
 * Only renders source metadata (path, line range) when available.
 * The filename, icon, and mime type are already shown in the preview row (PartPreview).
 * Returns null if there's no additional source metadata to display.
 */
export const FilePartRenderer = memo(function FilePartRenderer({ part }: FilePartRendererProps) {
  const source = part.source
  const isSymbol = source?.type === 'symbol'
  const isFileSource = source?.type === 'file'

  // No source metadata = nothing additional to show when expanded
  if (!source) {
    return null
  }

  return (
    <div className="text-[10px] text-muted-foreground">
      {isSymbol ? (
        <div className="flex items-center gap-2">
          <span className="font-medium text-primary">{source.name}</span>
          <span className="font-mono">{source.path}</span>
          <span className="text-muted-foreground/60">
            L{source.range.start.line}-{source.range.end.line}
          </span>
        </div>
      ) : isFileSource ? (
        <div className="flex items-center gap-2">
          <span className="font-mono">{source.path}</span>
          <span className="text-muted-foreground/60">
            L{source.text.start}-{source.text.end}
          </span>
        </div>
      ) : null}
    </div>
  )
})
