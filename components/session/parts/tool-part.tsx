'use client'

import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Code,
  FileEdit,
  FilePlus,
  FolderOpen,
  GitBranch,
  Globe,
  ListTodo,
  Loader2,
  Search,
  Terminal,
} from 'lucide-react'
import { memo, useState } from 'react'

import { Markdown } from '@/components/ui/markdown'
import type { ToolPart } from '@/lib/opencode'
import { cn } from '@/lib/utils'

import { ToolStatus } from './tool-status'

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

// Tool icon mapping
const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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

// Block tool display for rich output (bash, edit, write)
function BlockTool({
  part,
  icon: IconComponent,
  title,
  children,
  defaultExpanded = true,
}: {
  part: ToolPart
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const isComplete = part.state.status === 'completed'
  const isError = part.state.status === 'error'

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border',
        isError ? 'border-error/30 bg-error/5' : 'border-border bg-muted/20',
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40"
      >
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <IconComponent className="h-4 w-4 text-muted-foreground" />
        <span
          className={cn(
            'font-mono text-xs',
            isComplete ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {title}
        </span>
        <div className="ml-auto">
          <ToolStatus state={part.state} />
        </div>
      </button>

      {isExpanded ? (
        <div className="border-t border-border bg-background p-3 text-sm">{children}</div>
      ) : null}
    </div>
  )
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

  // Show block with output
  return (
    <BlockTool part={part} icon={Terminal} title={input.description ?? 'Shell'}>
      <div className="space-y-2">
        <div className="font-mono text-xs">
          <span className="text-muted-foreground">$</span> {input.command}
        </div>
        <pre className="max-h-96 overflow-auto rounded bg-muted/40 p-2 font-mono text-xs text-foreground">
          {output.trim()}
        </pre>
      </div>
    </BlockTool>
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

  // Show block with diff
  return (
    <BlockTool part={part} icon={FileEdit} title={`Edit ${normalizePath(input.filePath)}`}>
      <div className="space-y-2">
        {diff ? (
          <pre className="max-h-96 overflow-auto rounded bg-muted/40 p-2 font-mono text-xs">
            {diff.split('\n').map((line, lineIndex) => {
              let className = 'text-foreground'
              if (line.startsWith('+') && !line.startsWith('+++')) {
                className = 'text-green-500 bg-green-500/10'
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                className = 'text-red-500 bg-red-500/10'
              } else if (line.startsWith('@@')) {
                className = 'text-blue-500'
              }
              return (
                <div key={`diff-${lineIndex}-${line.slice(0, 20)}`} className={className}>
                  {line}
                </div>
              )
            })}
          </pre>
        ) : (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">oldString:</div>
            <pre className="rounded bg-red-500/10 p-2 font-mono text-xs text-red-500">
              {input.oldString}
            </pre>
            <div className="text-xs text-muted-foreground">newString:</div>
            <pre className="rounded bg-green-500/10 p-2 font-mono text-xs text-green-500">
              {input.newString}
            </pre>
          </div>
        )}
        {metadata.diagnostics && Object.keys(metadata.diagnostics).length > 0 ? (
          <div className="space-y-1 rounded border border-error/30 bg-error/5 p-2">
            {Object.entries(metadata.diagnostics).flatMap(([file, diagnostics]) =>
              diagnostics
                .filter((d) => d.severity === 1)
                .slice(0, 3)
                .map((d) => (
                  <div
                    key={`edit-${file}-${d.range.start.line}-${d.range.start.character}`}
                    className="text-xs text-error"
                  >
                    Error [{d.range.start.line + 1}:{d.range.start.character + 1}] {d.message}
                  </div>
                )),
            )}
          </div>
        ) : null}
      </div>
    </BlockTool>
  )
}

// Write tool renderer
function WriteTool({ part }: { part: ToolPart }) {
  const input = part.state.input as { filePath?: string; content?: string }
  const metadata = getMetadata<EditMetadata>(part.state)

  // If not completed, show inline
  if (part.state.status !== 'completed') {
    return (
      <InlineTool
        part={part}
        icon={FilePlus}
        title="Write"
        subtitle={normalizePath(input.filePath)}
      />
    )
  }

  // Show block with content preview
  return (
    <BlockTool
      part={part}
      icon={FilePlus}
      title={`Write ${normalizePath(input.filePath)}`}
      defaultExpanded={false}
    >
      <div className="space-y-2">
        <pre className="max-h-64 overflow-auto rounded bg-muted/40 p-2 font-mono text-xs">
          {input.content}
        </pre>
        {metadata.diagnostics && Object.keys(metadata.diagnostics).length > 0 ? (
          <div className="space-y-1 rounded border border-error/30 bg-error/5 p-2">
            {Object.entries(metadata.diagnostics).flatMap(([file, diagnostics]) =>
              diagnostics
                .filter((d) => d.severity === 1)
                .slice(0, 3)
                .map((d) => (
                  <div
                    key={`write-${file}-${d.range.start.line}-${d.range.start.character}`}
                    className="text-xs text-error"
                  >
                    Error [{d.range.start.line + 1}:{d.range.start.character + 1}] {d.message}
                  </div>
                )),
            )}
          </div>
        ) : null}
      </div>
    </BlockTool>
  )
}

// Read tool renderer
function ReadTool({ part }: { part: ToolPart }) {
  const input = part.state.input as { filePath?: string; offset?: number; limit?: number }

  const metadata: string[] = []
  if (input.offset) metadata.push(`offset: ${input.offset}`)
  if (input.limit) metadata.push(`limit: ${input.limit}`)

  return (
    <InlineTool
      part={part}
      icon={BookOpen}
      title="Read"
      subtitle={normalizePath(input.filePath)}
      metadata={metadata.length > 0 ? metadata.join(', ') : undefined}
    />
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

  // If we have a summary, show block with task details
  if (summary && summary.length > 0) {
    const current = [...summary].reverse().find((s) => s.state.status !== 'pending')

    return (
      <BlockTool
        part={part}
        icon={GitBranch}
        title={`${capitalize(input.subagent_type ?? 'Task')}: ${input.description}`}
        defaultExpanded={false}
      >
        <div className="space-y-2">
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
        </div>
      </BlockTool>
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
    <BlockTool part={part} icon={ListTodo} title="Todos" defaultExpanded={false}>
      <div className="space-y-1">
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
      </div>
    </BlockTool>
  )
}

// Generic tool renderer for unknown tools
function GenericTool({ part }: { part: ToolPart }) {
  const [isExpanded, setIsExpanded] = useState(part.state.status !== 'completed')
  const Icon = TOOL_ICONS[part.tool] ?? Code
  const title =
    part.state.status === 'completed' || part.state.status === 'running'
      ? (part.state.title ?? part.tool)
      : part.tool

  const output = part.state.status === 'completed' ? part.state.output : null
  const error = part.state.status === 'error' ? part.state.error : null
  const inputText =
    part.state.status === 'pending' && 'raw' in part.state
      ? part.state.raw
      : JSON.stringify(part.state.input, null, 2)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40"
      >
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-xs text-foreground">{title}</span>
        <ToolStatus state={part.state} />
      </button>

      {isExpanded ? (
        <div className="space-y-3 border-t border-border bg-background p-3 text-sm">
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Input</div>
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
