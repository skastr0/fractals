'use client'

import { FileText } from 'lucide-react'
import { memo } from 'react'
import type { Part } from '@/lib/opencode'

import { cn } from '@/lib/utils'

type FilePart = Extract<Part, { type: 'file' }>

interface FilePartRendererProps {
  part: FilePart
}

export const FilePartRenderer = memo(function FilePartRenderer({ part }: FilePartRendererProps) {
  const label = part.filename ?? part.url

  return (
    <a
      href={part.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1 text-xs text-muted-foreground',
        'hover:text-foreground',
      )}
    >
      <FileText className="h-3 w-3" />
      <span className="max-w-[240px] truncate font-mono">{label}</span>
    </a>
  )
})
