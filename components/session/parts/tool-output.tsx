'use client'

import { memo } from 'react'

import { Markdown } from '@/components/ui/markdown'
import { PierreDiffView } from '@/components/ui/pierre-diff-view'
import type { ToolPart } from '@/lib/opencode'

interface ToolOutputRendererProps {
  part: ToolPart
  isExpanded?: boolean
}

// Metadata type helpers
interface EditMetadata {
  diff?: string
  diagnostics?: Record<
    string,
    Array<{
      range: { start: { line: number; character: number } }
      message: string
      severity?: number
    }>
  >
}

function getDiffStats(diff: string): string {
  let additions = 0
  let deletions = 0
  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions++
    if (line.startsWith('-') && !line.startsWith('---')) deletions++
  }
  if (additions === 0 && deletions === 0) return ''
  return `+${additions} -${deletions}`
}

function formatDiffSummary(diff: string): string {
  const stats = getDiffStats(diff)
  return stats ? `Diff ready (${stats})` : 'Diff ready'
}

/**
 * ToolOutputRenderer - Renders ONLY the output/result content.
 * No boxes, no borders, no duplicate information.
 * The preview row already shows the tool name/description,
 * so this just shows the raw result.
 */
export const ToolOutputRenderer = memo(function ToolOutputRenderer({
  part,
  isExpanded = true,
}: ToolOutputRendererProps) {
  const { tool, state } = part

  // Pending state - nothing to show
  if (state.status === 'pending') {
    return <span className="text-xs text-muted-foreground">Waiting...</span>
  }

  // Running state
  if (state.status === 'running') {
    return <span className="text-xs text-muted-foreground">Running...</span>
  }

  // Error state
  if (state.status === 'error') {
    return <pre className="font-mono text-xs text-error">{state.error}</pre>
  }

  // Completed state - render tool-specific output
  const output = state.output
  const metadata = (state.metadata ?? {}) as EditMetadata
  const input = state.input as Record<string, unknown>

  switch (tool) {
    case 'bash': {
      // Show just the output, command is already in preview
      if (!output) return null
      return (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-foreground/80">
          {String(output).trim()}
        </pre>
      )
    }

    case 'edit': {
      const diff = metadata.diff
      if (!isExpanded) {
        if (!diff) return null
        return (
          <span className="text-xs text-muted-foreground">
            {formatDiffSummary(diff)}. Expand to view diff.
          </span>
        )
      }
      if (!diff) {
        // Fallback: show old/new strings
        const oldStr = input.oldString as string | undefined
        const newStr = input.newString as string | undefined
        return (
          <div className="space-y-2 font-mono text-xs">
            {oldStr && (
              <pre className="text-red-400/80">{`- ${oldStr.split('\n').join('\n- ')}`}</pre>
            )}
            {newStr && (
              <pre className="text-green-400/80">{`+ ${newStr.split('\n').join('\n+ ')}`}</pre>
            )}
          </div>
        )
      }

      return <PierreDiffView diff={diff} />
    }

    case 'write': {
      // Show content written (truncated if long)
      const content = input.content as string | undefined
      if (!content) return null
      const lines = content.split('\n')
      const display =
        lines.length > 50
          ? `${lines.slice(0, 50).join('\n')}\n... (${lines.length - 50} more lines)`
          : content
      return (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-foreground/80">
          {display}
        </pre>
      )
    }

    case 'read': {
      // Read output is typically the file content
      if (!output) return <span className="text-xs text-muted-foreground">Empty file</span>
      return (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-foreground/80">
          {String(output)}
        </pre>
      )
    }

    case 'glob':
    case 'grep':
    case 'list': {
      // These typically return lists
      if (!output) return <span className="text-xs text-muted-foreground">No results</span>
      return (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-foreground/80">
          {String(output)}
        </pre>
      )
    }

    case 'webfetch': {
      // Web content - render as markdown
      if (!output) return null
      return <Markdown content={String(output)} className="text-sm" />
    }

    case 'task': {
      // Task/subagent - show summary or output
      if (!output) return <span className="text-xs text-muted-foreground">Task completed</span>
      return <Markdown content={String(output)} className="text-sm" />
    }

    case 'todowrite':
    case 'todoread': {
      // Todo updates
      const todos = input.todos as
        | Array<{ id: string; content: string; status: string }>
        | undefined
      if (!todos?.length) return <span className="text-xs text-muted-foreground">No todos</span>
      return (
        <div className="space-y-0.5 text-xs">
          {todos.map((todo) => (
            <div key={todo.id} className="flex items-center gap-2">
              <span
                className={todo.status === 'completed' ? 'text-green-400' : 'text-muted-foreground'}
              >
                [{todo.status === 'completed' ? 'x' : ' '}]
              </span>
              <span className="text-foreground/80">{todo.content}</span>
            </div>
          ))}
        </div>
      )
    }

    default: {
      const fallbackOutput =
        output ??
        (state.metadata && Object.keys(state.metadata).length > 0 ? state.metadata : undefined)

      // Generic fallback - show output as markdown or raw
      if (!fallbackOutput) {
        return <span className="text-xs text-muted-foreground">Completed</span>
      }
      if (typeof fallbackOutput === 'string') {
        return <Markdown content={fallbackOutput} className="text-sm" />
      }
      return (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-foreground/80">
          {JSON.stringify(fallbackOutput, null, 2)}
        </pre>
      )
    }
  }
})
