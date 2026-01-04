'use client'

import { Code, FileText } from 'lucide-react'
import { memo } from 'react'
import type { Part } from '@/lib/opencode'

import { cn } from '@/lib/utils'

type FilePart = Extract<Part, { type: 'file' }>

interface FilePartRendererProps {
  part: FilePart
}

export const FilePartRenderer = memo(function FilePartRenderer({ part }: FilePartRendererProps) {
  const label = part.filename ?? part.url
  const source = part.source
  const isSymbol = source?.type === 'symbol'
  const isFileSource = source?.type === 'file'

  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted/20">
      <a
        href={part.url}
        target="_blank"
        rel="noreferrer"
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground',
          'hover:bg-muted/40 hover:text-foreground',
        )}
      >
        {isSymbol ? (
          <Code className="h-3.5 w-3.5 text-primary" />
        ) : (
          <FileText className="h-3.5 w-3.5" />
        )}
        <span className="max-w-[240px] truncate font-mono">{label}</span>
        {part.mime ? (
          <span className="rounded bg-secondary/60 px-1.5 py-0.5 text-[10px]">{part.mime}</span>
        ) : null}
      </a>
      {source ? (
        <div className="border-t border-border/50 bg-background/30 px-3 py-1.5 text-[10px] text-muted-foreground">
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
      ) : null}
    </div>
  )
})
