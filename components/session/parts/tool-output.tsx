'use client'

import { Expand, X } from 'lucide-react'
import { memo, useState } from 'react'
import {
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components'

import { Button } from '@/components/ui/button'
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

// Maximum lines to show inline before offering spotlight
const MAX_PREVIEW_LINES = 15

/**
 * ContentWithSpotlight - Shows a fixed preview with optional spotlight modal
 * NO internal scrolling - scroll only happens in the spotlight modal
 */
function ContentWithSpotlight({
  content,
  title,
  subtitle,
  previewLines = MAX_PREVIEW_LINES,
}: {
  content: string
  title: string
  subtitle?: string
  previewLines?: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const lines = content.split('\n')
  const hasMore = lines.length > previewLines
  const preview = lines.slice(0, previewLines).join('\n')
  const lineCount = lines.length

  return (
    <div>
      {/* Fixed preview - NO internal scroll */}
      <pre className="whitespace-pre-wrap break-words font-mono text-xs text-foreground/80">
        {preview}
        {hasMore && (
          <span className="text-muted-foreground">
            {'\n'}... ({lineCount - previewLines} more lines)
          </span>
        )}
      </pre>

      {/* Spotlight button */}
      {hasMore && (
        <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Expand className="h-3 w-3" />
            View full output ({lineCount} lines)
          </Button>

          <ModalOverlay
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[entering]:animate-in data-[entering]:fade-in-0 data-[exiting]:animate-out data-[exiting]:fade-out-0"
            isDismissable
          >
            <Modal className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 md:inset-8 lg:inset-12">
              <AriaDialog className="flex h-full flex-col outline-none">
                {({ close }) => (
                  <>
                    <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <Heading
                          slot="title"
                          className="truncate font-mono text-sm font-medium text-foreground"
                        >
                          {title}
                        </Heading>
                        {subtitle ? (
                          <p className="text-xs text-muted-foreground">{subtitle}</p>
                        ) : null}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2 flex-shrink-0"
                        onPress={close}
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Scrolling happens HERE in the modal, not inline */}
                    <div className="min-h-0 flex-1 overflow-auto p-4">
                      <pre className="whitespace-pre-wrap break-words font-mono text-xs text-foreground/80">
                        {content}
                      </pre>
                    </div>
                  </>
                )}
              </AriaDialog>
            </Modal>
          </ModalOverlay>
        </AriaDialogTrigger>
      )}
    </div>
  )
}

/**
 * ToolOutputRenderer - Renders ONLY the output/result content.
 * No internal scrolling - uses spotlight modal for large content.
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
      if (!output) return null
      const outputStr = String(output).trim()
      const command = (input.command as string) ?? 'shell'
      return <ContentWithSpotlight content={outputStr} title={`$ ${command}`} subtitle="Output" />
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
        // Fallback: show old/new strings as simple diff
        const oldStr = input.oldString as string | undefined
        const newStr = input.newString as string | undefined
        return (
          <div className="space-y-2 font-mono text-xs">
            {oldStr && (
              <pre className="whitespace-pre-wrap text-red-400/80">{`- ${oldStr.split('\n').join('\n- ')}`}</pre>
            )}
            {newStr && (
              <pre className="whitespace-pre-wrap text-green-400/80">{`+ ${newStr.split('\n').join('\n+ ')}`}</pre>
            )}
          </div>
        )
      }
      // PierreDiffView handles its own display
      return <PierreDiffView diff={diff} />
    }

    case 'write': {
      // Render write as a diff (all additions)
      const content = input.content as string | undefined
      const filePath = (input.filePath as string) ?? 'file'
      if (!content) return null

      // If we have metadata diff, use it
      if (metadata.diff) {
        return <PierreDiffView diff={metadata.diff} />
      }

      // Synthesize a diff showing all lines as additions
      const lines = content.split('\n')
      const syntheticDiff = [
        '--- /dev/null',
        `+++ ${filePath}`,
        `@@ -0,0 +1,${lines.length} @@`,
        ...lines.map((line) => `+${line}`),
      ].join('\n')

      return <PierreDiffView diff={syntheticDiff} />
    }

    case 'read': {
      if (!output) return <span className="text-xs text-muted-foreground">Empty file</span>
      const filePath = (input.filePath as string) ?? 'file'
      return (
        <ContentWithSpotlight
          content={String(output)}
          title={filePath}
          subtitle={`${String(output).split('\n').length} lines`}
        />
      )
    }

    case 'glob':
    case 'grep':
    case 'list': {
      if (!output) return <span className="text-xs text-muted-foreground">No results</span>
      const pattern = (input.pattern as string) ?? (input.path as string) ?? tool
      return (
        <ContentWithSpotlight
          content={String(output)}
          title={tool}
          subtitle={pattern}
          previewLines={20}
        />
      )
    }

    case 'webfetch': {
      // Web content - render as markdown (naturally wraps, no scroll needed)
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
      // Todo updates - always small, no spotlight needed
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

      if (!fallbackOutput) {
        return <span className="text-xs text-muted-foreground">Completed</span>
      }
      if (typeof fallbackOutput === 'string') {
        return <Markdown content={fallbackOutput} className="text-sm" />
      }
      // JSON output - use spotlight for large content
      const jsonStr = JSON.stringify(fallbackOutput, null, 2)
      return <ContentWithSpotlight content={jsonStr} title={tool} subtitle="Output" />
    }
  }
})
