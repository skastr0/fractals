'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { memo, useMemo, useState } from 'react'

import { Markdown } from '@/components/ui/markdown'
import type { ToolPart } from '@/lib/opencode'
import { cn } from '@/lib/utils'

import { ToolStatus } from './tool-status'

interface ToolPartRendererProps {
  part: ToolPart
}

const getToolTitle = (part: ToolPart) => {
  const state = part.state
  if (state.status === 'completed' || state.status === 'running') {
    return state.title ?? part.tool
  }
  return part.tool
}

const getInputLabel = (state: ToolPart['state']) =>
  state.status === 'pending' && state.raw ? 'Raw input' : 'Input'

export const ToolPartRenderer = memo(function ToolPartRenderer({ part }: ToolPartRendererProps) {
  const [isExpanded, setIsExpanded] = useState(part.state.status !== 'completed')
  const title = useMemo(() => getToolTitle(part), [part])
  const inputLabel = getInputLabel(part.state)
  const inputText =
    part.state.status === 'pending' && 'raw' in part.state
      ? part.state.raw
      : JSON.stringify(part.state.input, null, 2)

  const output = part.state.status === 'completed' ? part.state.output : null
  const error = part.state.status === 'error' ? part.state.error : null

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40"
      >
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="font-mono text-xs text-foreground">{title}</span>
        <ToolStatus state={part.state} />
      </button>

      {isExpanded ? (
        <div className="space-y-3 border-t border-border bg-background p-3 text-sm">
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">{inputLabel}</div>
            <pre className="max-h-64 overflow-x-auto rounded bg-muted/40 p-2 text-xs">
              {inputText}
            </pre>
          </div>

          {output ? (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Output</div>
              <Markdown content={output} className="text-sm" />
            </div>
          ) : null}

          {error ? <div className="text-sm text-error">{error}</div> : null}

          {'attachments' in part.state && part.state.attachments?.length ? (
            <div className="flex flex-wrap gap-2">
              {part.state.attachments.map((file) => (
                <span
                  key={file.id}
                  className={cn(
                    'inline-flex items-center gap-1 rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground',
                    'max-w-[240px] truncate font-mono',
                  )}
                >
                  {file.filename ?? file.url}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
})
