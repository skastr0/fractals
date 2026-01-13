'use client'

import {
  BookOpen,
  Expand,
  FileEdit,
  FilePlus,
  FolderOpen,
  GitBranch,
  Globe,
  ListTodo,
  Loader2,
  Search,
  Terminal,
  X,
} from 'lucide-react'
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
import { cn } from '@/lib/utils'

interface ToolPartRendererProps {
  part: ToolPart
}

// Tool metadata types for type safety
interface BashMetadata {
  output?: string
}

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

interface GlobMetadata {
  count?: number
}

interface GrepMetadata {
  matches?: number
}

interface TaskMetadata {
  sessionId?: string
  summary?: Array<{
    tool: string
    state: { status: string; title?: string }
    isSubagent?: boolean
  }>
}

type ToolMetadata =
  | BashMetadata
  | EditMetadata
  | GlobMetadata
  | GrepMetadata
  | TaskMetadata
  | Record<string, unknown>

// Helper to get tool metadata with type safety
function getMetadata<T extends ToolMetadata>(state: ToolPart['state']): T {
  if (state.status === 'pending') return {} as T
  return (state.metadata ?? {}) as T
}

// Helper to normalize file paths
function normalizePath(input?: string): string {
  if (!input) return ''
  // Remove leading ./ if present
  if (input.startsWith('./')) return input.slice(2)
  return input
}

// Tool icon mapping (used by InlineTool component)
const _TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bash: Terminal,
  read: BookOpen,
  write: FilePlus,
  edit: FileEdit,
  glob: Search,
  grep: Search,
  list: FolderOpen,
  webfetch: Globe,
  task: GitBranch,
  todowrite: ListTodo,
  todoread: ListTodo,
}

// Compact inline tool display for search/read operations
function InlineTool({
  part,
  icon: IconComponent,
  title,
  subtitle,
  metadata,
}: {
  part: ToolPart
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  metadata?: string
}) {
  const isComplete = part.state.status === 'completed'
  const isError = part.state.status === 'error'

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
        isComplete ? 'bg-muted/30' : 'bg-muted/50',
        isError && 'border border-error/30 bg-error/5',
      )}
    >
      <IconComponent
        className={cn(
          'h-4 w-4 flex-shrink-0',
          isComplete ? 'text-muted-foreground' : 'text-foreground',
        )}
      />
      <span className={cn('font-medium', isComplete ? 'text-muted-foreground' : 'text-foreground')}>
        {title}
      </span>
      {subtitle ? <span className="truncate text-muted-foreground">{subtitle}</span> : null}
      {metadata ? <span className="ml-auto text-xs text-muted-foreground">{metadata}</span> : null}
      {isError && 'error' in part.state ? (
        <span className="ml-auto text-xs text-error">{part.state.error}</span>
      ) : null}
      {part.state.status === 'running' ? (
        <Loader2 className="ml-auto h-3 w-3 animate-spin text-primary" />
      ) : null}
    </div>
  )
}

// Content-only tool display - NO borders, NO wrapper boxes
// Parent PartItem handles the container styling
function ToolContent({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2 text-sm">{children}</div>
}

// Bash tool renderer
function BashTool({ part }: { part: ToolPart }) {
  const input = part.state.input as { command?: string; description?: string }
  const metadata = getMetadata<BashMetadata>(part.state)
  const output =
    part.state.status === 'completed' ? (part.state.output ?? metadata.output) : undefined

  // If no output yet, show inline
  if (!output) {
    return (
      <InlineTool
        part={part}
        icon={Terminal}
        title={input.description ?? 'Shell'}
        subtitle={input.command ? `$ ${input.command}` : undefined}
      />
    )
  }

  // Show output directly - no wrapper box
  return (
    <ToolContent>
      <div className="font-mono text-xs">
        <span className="text-muted-foreground">$</span> {input.command}
      </div>
      <pre className="max-w-full whitespace-pre-wrap break-words rounded bg-muted/30 p-2 font-mono text-xs text-foreground">
        {output.trim()}
      </pre>
    </ToolContent>
  )
}

// Edit tool renderer with diff support
function EditTool({ part }: { part: ToolPart }) {
  const input = part.state.input as {
    filePath?: string
    oldString?: string
    newString?: string
    replaceAll?: boolean
  }
  const metadata = getMetadata<EditMetadata>(part.state)
  const diff = metadata.diff

  // If not completed, show inline
  if (part.state.status !== 'completed') {
    return (
      <InlineTool
        part={part}
        icon={FileEdit}
        title="Edit"
        subtitle={normalizePath(input.filePath)}
      />
    )
  }

  // Show diff directly
  return (
    <ToolContent>
      {diff ? (
        <PierreDiffView diff={diff} />
      ) : (
        <>
          <div className="text-xs text-muted-foreground">oldString:</div>
          <pre className="max-w-full whitespace-pre-wrap break-words rounded bg-red-500/10 p-2 font-mono text-xs text-red-500">
            {input.oldString}
          </pre>
          <div className="text-xs text-muted-foreground">newString:</div>
          <pre className="max-w-full whitespace-pre-wrap break-words rounded bg-green-500/10 p-2 font-mono text-xs text-green-500">
            {input.newString}
          </pre>
        </>
      )}
      {metadata.diagnostics && Object.keys(metadata.diagnostics).length > 0 ? (
        <div className="space-y-1 text-xs text-error">
          {Object.entries(metadata.diagnostics).flatMap(([file, diagnostics]) =>
            diagnostics
              .filter((d) => d.severity === 1)
              .slice(0, 3)
              .map((d, idx) => (
                <div key={`edit-${file}-${d.range.start.line}-${d.range.start.character}-${idx}`}>
                  Error [{d.range.start.line + 1}:{d.range.start.character + 1}] {d.message}
                </div>
              )),
          )}
        </div>
      ) : null}
    </ToolContent>
  )
}

// Write tool renderer - shows diff (all additions for new files)
function WriteTool({ part }: { part: ToolPart }) {
  const input = part.state.input as { filePath?: string; content?: string }
  const metadata = getMetadata<EditMetadata>(part.state)
  const filePath = normalizePath(input.filePath)

  // If not completed, show inline
  if (part.state.status !== 'completed') {
    return <InlineTool part={part} icon={FilePlus} title="Write" subtitle={filePath} />
  }

  // If we have a diff from metadata, use it
  if (metadata.diff) {
    return (
      <ToolContent>
        <PierreDiffView diff={metadata.diff} />
        {metadata.diagnostics && Object.keys(metadata.diagnostics).length > 0 ? (
          <div className="space-y-1 text-xs text-error">
            {Object.entries(metadata.diagnostics).flatMap(([file, diagnostics]) =>
              diagnostics
                .filter((d) => d.severity === 1)
                .slice(0, 3)
                .map((d, idx) => (
                  <div
                    key={`write-${file}-${d.range.start.line}-${d.range.start.character}-${idx}`}
                  >
                    Error [{d.range.start.line + 1}:{d.range.start.character + 1}] {d.message}
                  </div>
                )),
            )}
          </div>
        ) : null}
      </ToolContent>
    )
  }

  // Synthesize a diff showing all lines as additions (new file)
  const content = input.content ?? ''
  const lines = content.split('\n')
  const lineCount = lines.length

  // Create a synthetic unified diff
  const syntheticDiff = [
    `--- /dev/null`,
    `+++ ${filePath}`,
    `@@ -0,0 +1,${lineCount} @@`,
    ...lines.map((line) => `+${line}`),
  ].join('\n')

  return (
    <ToolContent>
      <PierreDiffView diff={syntheticDiff} />
      {metadata.diagnostics && Object.keys(metadata.diagnostics).length > 0 ? (
        <div className="space-y-1 text-xs text-error">
          {Object.entries(metadata.diagnostics).flatMap(([file, diagnostics]) =>
            diagnostics
              .filter((d) => d.severity === 1)
              .slice(0, 3)
              .map((d, idx) => (
                <div key={`write-${file}-${d.range.start.line}-${d.range.start.character}-${idx}`}>
                  Error [{d.range.start.line + 1}:{d.range.start.character + 1}] {d.message}
                </div>
              )),
          )}
        </div>
      ) : null}
    </ToolContent>
  )
}

// Read tool renderer - shows fixed preview with spotlight for full content
function ReadTool({ part }: { part: ToolPart }) {
  const [isOpen, setIsOpen] = useState(false)
  const input = part.state.input as { filePath?: string; offset?: number; limit?: number }
  const output = part.state.status === 'completed' ? part.state.output : null
  const filePath = normalizePath(input.filePath)

  const metaItems: string[] = []
  if (input.offset) metaItems.push(`offset: ${input.offset}`)
  if (input.limit) metaItems.push(`limit: ${input.limit}`)

  // Show inline if not completed
  if (part.state.status !== 'completed' || !output) {
    return (
      <InlineTool
        part={part}
        icon={BookOpen}
        title="Read"
        subtitle={filePath}
        metadata={metaItems.length > 0 ? metaItems.join(', ') : undefined}
      />
    )
  }

  // Get a preview (first ~10 lines)
  const content = String(output)
  const lines = content.split('\n')
  const previewLines = lines.slice(0, 10)
  const hasMore = lines.length > 10
  const lineCount = lines.length

  return (
    <ToolContent>
      {/* Fixed-height preview - no internal scroll */}
      <pre className="whitespace-pre-wrap break-words font-mono text-xs text-foreground/80">
        {previewLines.join('\n')}
        {hasMore && (
          <span className="text-muted-foreground">
            {'\n'}... ({lineCount - 10} more lines)
          </span>
        )}
      </pre>

      {/* Spotlight button to view full content */}
      {hasMore && (
        <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Expand className="h-3 w-3" />
            View full file ({lineCount} lines)
          </Button>

          <ModalOverlay
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[entering]:animate-in data-[entering]:fade-in-0 data-[exiting]:animate-out data-[exiting]:fade-out-0"
            isDismissable
          >
            <Modal className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 md:inset-8 lg:inset-12">
              <AriaDialog className="flex h-full flex-col outline-none">
                {({ close }) => (
                  <>
                    {/* Header */}
                    <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <Heading
                          slot="title"
                          className="truncate font-mono text-sm font-medium text-foreground"
                        >
                          {filePath}
                        </Heading>
                        <p className="text-xs text-muted-foreground">{lineCount} lines</p>
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

                    {/* Scrollable content area - scroll happens HERE in the modal, not in the pane */}
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
    </ToolContent>
  )
}

// Glob tool renderer
function GlobTool({ part }: { part: ToolPart }) {
  const input = part.state.input as { pattern?: string; path?: string }
  const metadata = getMetadata<GlobMetadata>(part.state)

  return (
    <InlineTool
      part={part}
      icon={Search}
      title="Glob"
      subtitle={`"${input.pattern}"${input.path ? ` in ${normalizePath(input.path)}` : ''}`}
      metadata={metadata.count !== undefined ? `${metadata.count} matches` : undefined}
    />
  )
}

// Grep tool renderer
function GrepTool({ part }: { part: ToolPart }) {
  const input = part.state.input as { pattern?: string; path?: string; include?: string }
  const metadata = getMetadata<GrepMetadata>(part.state)

  return (
    <InlineTool
      part={part}
      icon={Search}
      title="Grep"
      subtitle={`"${input.pattern}"${input.path ? ` in ${normalizePath(input.path)}` : ''}`}
      metadata={metadata.matches !== undefined ? `${metadata.matches} matches` : undefined}
    />
  )
}

// List tool renderer
function ListTool({ part }: { part: ToolPart }) {
  const input = part.state.input as { path?: string }

  return (
    <InlineTool
      part={part}
      icon={FolderOpen}
      title="List"
      subtitle={normalizePath(input.path) || '.'}
    />
  )
}

// WebFetch tool renderer
function WebFetchTool({ part }: { part: ToolPart }) {
  const input = part.state.input as { url?: string }

  return <InlineTool part={part} icon={Globe} title="WebFetch" subtitle={input.url} />
}

// Task tool renderer
function TaskTool({ part }: { part: ToolPart }) {
  const input = part.state.input as { subagent_type?: string; description?: string }
  const metadata = getMetadata<TaskMetadata>(part.state)
  const summary = metadata.summary

  // If we have a summary, show task details directly
  if (summary && summary.length > 0) {
    const current = [...summary].reverse().find((s) => s.state.status !== 'pending')

    return (
      <ToolContent>
        <div className="text-xs text-muted-foreground">{summary.length} tool calls</div>
        {current ? (
          <div
            className={cn(
              'text-xs',
              current.state.status === 'error' ? 'text-error' : 'text-muted-foreground',
            )}
          >
            {current.isSubagent ? '○ ' : '└ '}
            {capitalize(current.tool)}{' '}
            {current.state.status === 'completed' ? current.state.title : ''}
            {current.isSubagent ? ' [subagent]' : ''}
          </div>
        ) : null}
      </ToolContent>
    )
  }

  return (
    <InlineTool
      part={part}
      icon={GitBranch}
      title={capitalize(input.subagent_type ?? 'Task')}
      subtitle={input.description}
    />
  )
}

// TodoWrite tool renderer
function TodoWriteTool({ part }: { part: ToolPart }) {
  const input = part.state.input as {
    todos?: Array<{ id: string; content: string; status: string; priority: string }>
  }
  const todos = input.todos ?? []

  if (todos.length === 0 || part.state.status !== 'completed') {
    return <InlineTool part={part} icon={ListTodo} title="Todo" subtitle="Updating todos..." />
  }

  return (
    <ToolContent>
      {todos.map((todo) => (
        <div key={todo.id} className="flex items-start gap-2 text-xs">
          <span
            className={cn(
              'flex-shrink-0 rounded px-1.5 py-0.5 font-medium',
              todo.status === 'completed'
                ? 'bg-success/20 text-success'
                : todo.status === 'in_progress'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            {todo.status}
          </span>
          <span className="text-foreground">{todo.content}</span>
        </div>
      ))}
    </ToolContent>
  )
}

// Generic tool renderer for unknown tools (no collapsible - parent handles that)
function GenericTool({ part }: { part: ToolPart }) {
  const output = part.state.status === 'completed' ? part.state.output : null
  const error = part.state.status === 'error' ? part.state.error : null
  const inputText =
    part.state.status === 'pending' && 'raw' in part.state
      ? part.state.raw
      : JSON.stringify(part.state.input, null, 2)

  return (
    <ToolContent>
      <div>
        <div className="mb-1 text-xs font-medium text-muted-foreground">Input</div>
        <pre className="max-w-full whitespace-pre-wrap break-words rounded bg-muted/30 p-2 text-xs">
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
    </ToolContent>
  )
}

// Helper to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Main tool part renderer with tool-specific routing
export const ToolPartRenderer = memo(function ToolPartRenderer({ part }: ToolPartRendererProps) {
  switch (part.tool) {
    case 'bash':
      return <BashTool part={part} />
    case 'edit':
      return <EditTool part={part} />
    case 'write':
      return <WriteTool part={part} />
    case 'read':
      return <ReadTool part={part} />
    case 'glob':
      return <GlobTool part={part} />
    case 'grep':
      return <GrepTool part={part} />
    case 'list':
      return <ListTool part={part} />
    case 'webfetch':
      return <WebFetchTool part={part} />
    case 'task':
      return <TaskTool part={part} />
    case 'todowrite':
    case 'todoread':
      return <TodoWriteTool part={part} />
    default:
      return <GenericTool part={part} />
  }
})
