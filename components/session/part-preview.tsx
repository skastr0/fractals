'use client'

import {
  AlertTriangle,
  BookOpen,
  Bot,
  Brain,
  ChevronRight,
  FileCode,
  FileEdit,
  FilePlus,
  FileText,
  FolderOpen,
  GitBranch,
  Globe,
  ListTodo,
  MessageSquare,
  Minimize2,
  RefreshCw,
  Search,
  Terminal,
} from 'lucide-react'
import { type ComponentType, memo } from 'react'

import type { Part, ToolPart } from '@/lib/opencode'
import { cn } from '@/lib/utils'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PartPreviewProps {
  part: Part
  isStreaming?: boolean
  isExpanded?: boolean
  className?: string
}

// Type helpers for narrowing
type TextPart = Extract<Part, { type: 'text' }>
type ReasoningPart = Extract<Part, { type: 'reasoning' }>
type FilePart = Extract<Part, { type: 'file' }>
type PatchPart = Extract<Part, { type: 'patch' }>
type AgentPart = Extract<Part, { type: 'agent' }>
type SubtaskPart = Extract<Part, { type: 'subtask' }>
type RetryPart = Extract<Part, { type: 'retry' }>
type CompactionPart = Extract<Part, { type: 'compaction' }>

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MAX_TEXT_LENGTH = 100
const MAX_REASONING_LENGTH = 80
const MAX_COMMAND_LENGTH = 60

// Tool icon mapping
const TOOL_ICONS: Record<string, ComponentType<{ className?: string }>> = {
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

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

function truncate(text: string, maxLength: number): string {
  const cleaned = text.replace(/\n/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength - 1)}…`
}

function normalizePath(input?: string): string {
  if (!input) return ''
  return input.startsWith('./') ? input.slice(2) : input
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// -----------------------------------------------------------------------------
// Preview Layout Component
// -----------------------------------------------------------------------------

interface PreviewLayoutProps {
  icon: ComponentType<{ className?: string }>
  iconClassName?: string
  label?: string
  preview: string
  badge?: string
  isStreaming?: boolean
  isExpanded?: boolean
  className?: string
}

function PreviewLayout({
  icon: Icon,
  iconClassName,
  label,
  preview,
  badge,
  isStreaming,
  isExpanded,
  className,
}: PreviewLayoutProps) {
  return (
    <div
      className={cn(
        'flex h-7 items-center gap-1.5 px-2 text-xs',
        'transition-colors hover:bg-muted/20',
        className,
      )}
    >
      <ChevronRight
        className={cn(
          'h-3 w-3 flex-shrink-0 text-muted-foreground/50 transition-transform duration-150',
          isExpanded && 'rotate-90',
        )}
      />

      <Icon className={cn('h-3.5 w-3.5 flex-shrink-0 text-muted-foreground', iconClassName)} />

      {label ? (
        <span className="flex-shrink-0 text-[10px] font-medium text-muted-foreground">{label}</span>
      ) : null}

      <span className="min-w-0 flex-1 truncate text-foreground/70">{preview}</span>

      {badge ? (
        <span className="flex-shrink-0 font-mono text-[9px] text-muted-foreground">{badge}</span>
      ) : null}

      {isStreaming ? (
        <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-green-500" />
      ) : null}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Part-Specific Preview Generators
// -----------------------------------------------------------------------------

function TextPreview({
  part,
  isStreaming,
  isExpanded,
}: {
  part: TextPart
  isStreaming?: boolean
  isExpanded?: boolean
}) {
  if (part.ignored) return null
  const isEmpty = !part.text.trim()
  if (isEmpty && !isStreaming) return null

  const preview = truncate(part.text, MAX_TEXT_LENGTH)

  return (
    <PreviewLayout
      icon={MessageSquare}
      label={part.synthetic ? 'System' : undefined}
      preview={preview || 'Waiting for response…'}
      isStreaming={isStreaming}
      isExpanded={isExpanded}
      iconClassName={part.synthetic ? 'text-muted-foreground/60' : undefined}
    />
  )
}

function ReasoningPreview({
  part,
  isStreaming,
  isExpanded,
}: {
  part: ReasoningPart
  isStreaming?: boolean
  isExpanded?: boolean
}) {
  const preview = truncate(part.text, MAX_REASONING_LENGTH)

  return (
    <PreviewLayout
      icon={Brain}
      iconClassName="text-primary"
      label="Thinking"
      preview={preview || 'Processing…'}
      isStreaming={isStreaming}
      isExpanded={isExpanded}
    />
  )
}

function ToolPreview({
  part,
  isStreaming,
  isExpanded,
}: {
  part: ToolPart
  isStreaming?: boolean
  isExpanded?: boolean
}) {
  const Icon = TOOL_ICONS[part.tool] ?? Terminal
  const isPending = part.state.status === 'pending'
  const isRunning = part.state.status === 'running'
  const isError = part.state.status === 'error'
  const isCompleted = part.state.status === 'completed'

  // Get tool-specific preview
  const { label, preview, badge } = getToolPreview(part)

  return (
    <PreviewLayout
      icon={Icon}
      iconClassName={cn(
        isError && 'text-error',
        isCompleted && 'text-muted-foreground',
        isRunning && 'text-primary',
      )}
      label={label}
      preview={preview}
      badge={badge}
      isStreaming={isStreaming || isRunning || isPending}
      isExpanded={isExpanded}
    />
  )
}

function getToolPreview(part: ToolPart): { label: string; preview: string; badge?: string } {
  const input = part.state.input as Record<string, unknown>

  switch (part.tool) {
    case 'bash': {
      const command = (input.command as string) ?? ''
      const description = (input.description as string) ?? ''
      return {
        label: 'Bash',
        preview: description || truncate(`$ ${command}`, MAX_COMMAND_LENGTH),
      }
    }

    case 'read': {
      const filePath = normalizePath(input.filePath as string)
      const offset = input.offset as number | undefined
      const limit = input.limit as number | undefined
      const hasRange = offset !== undefined || limit !== undefined
      return {
        label: 'Read',
        preview: filePath,
        badge: hasRange ? `${offset ?? 0}:${limit ?? '∞'}` : undefined,
      }
    }

    case 'edit': {
      const filePath = normalizePath(input.filePath as string)
      // Count lines changed if we have old/new strings
      const metadata = getCompletedMetadata(part)
      const diff = metadata?.diff as string | undefined
      const linesInfo = diff ? getDiffStats(diff) : undefined
      return {
        label: 'Edit',
        preview: filePath,
        badge: linesInfo,
      }
    }

    case 'write': {
      const filePath = normalizePath(input.filePath as string)
      return {
        label: 'Write',
        preview: filePath,
      }
    }

    case 'glob': {
      const pattern = (input.pattern as string) ?? ''
      const path = normalizePath(input.path as string)
      const metadata = getCompletedMetadata(part)
      const count = metadata?.count as number | undefined
      return {
        label: 'Glob',
        preview: `"${pattern}"${path ? ` in ${path}` : ''}`,
        badge: count !== undefined ? `${count}` : undefined,
      }
    }

    case 'grep': {
      const pattern = (input.pattern as string) ?? ''
      const path = normalizePath(input.path as string)
      const metadata = getCompletedMetadata(part)
      const matches = metadata?.matches as number | undefined
      return {
        label: 'Grep',
        preview: `"${pattern}"${path ? ` in ${path}` : ''}`,
        badge: matches !== undefined ? `${matches}` : undefined,
      }
    }

    case 'list': {
      const path = normalizePath(input.path as string) || '.'
      return {
        label: 'List',
        preview: path,
      }
    }

    case 'webfetch': {
      const url = (input.url as string) ?? ''
      return {
        label: 'Fetch',
        preview: url,
      }
    }

    case 'task': {
      const agentType = (input.subagent_type as string) ?? 'task'
      const description = (input.description as string) ?? ''
      return {
        label: capitalize(agentType),
        preview: description,
      }
    }

    case 'todowrite':
    case 'todoread': {
      return {
        label: 'Todo',
        preview: 'Managing todos…',
      }
    }

    default: {
      const title =
        part.state.status === 'completed' || part.state.status === 'running'
          ? ((part.state as { title?: string }).title ?? part.tool)
          : part.tool
      return {
        label: capitalize(part.tool),
        preview: title,
      }
    }
  }
}

function getCompletedMetadata(part: ToolPart): Record<string, unknown> | undefined {
  if (part.state.status !== 'completed') return undefined
  return (part.state as { metadata?: Record<string, unknown> }).metadata
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

function FilePreview({ part, isExpanded }: { part: FilePart; isExpanded?: boolean }) {
  const label = part.filename ?? part.url
  const source = part.source
  const isSymbol = source?.type === 'symbol'

  return (
    <PreviewLayout
      icon={isSymbol ? FileCode : FileText}
      iconClassName={isSymbol ? 'text-primary' : undefined}
      preview={label ?? 'File attachment'}
      badge={part.mime ?? undefined}
      isExpanded={isExpanded}
    />
  )
}

function PatchPreview({ part, isExpanded }: { part: PatchPart; isExpanded?: boolean }) {
  const fileCount = part.files.length

  return (
    <PreviewLayout
      icon={FileCode}
      label="Patch"
      preview={part.hash.slice(0, 8)}
      badge={`${fileCount} file${fileCount !== 1 ? 's' : ''}`}
      isExpanded={isExpanded}
    />
  )
}

function AgentPreview({ part, isExpanded }: { part: AgentPart; isExpanded?: boolean }) {
  return (
    <PreviewLayout
      icon={Bot}
      iconClassName="text-primary"
      label="Subagent"
      preview={part.name}
      isExpanded={isExpanded}
    />
  )
}

function SubtaskPreview({ part, isExpanded }: { part: SubtaskPart; isExpanded?: boolean }) {
  return (
    <PreviewLayout
      icon={GitBranch}
      iconClassName="text-amber-500"
      label={part.agent}
      preview={part.description}
      isExpanded={isExpanded}
    />
  )
}

function RetryPreview({ part, isExpanded }: { part: RetryPart; isExpanded?: boolean }) {
  return (
    <PreviewLayout
      icon={RefreshCw}
      iconClassName="text-amber-500"
      label={`Retry #${part.attempt}`}
      preview={part.error.name}
      isExpanded={isExpanded}
    />
  )
}

function CompactionPreview({ part, isExpanded }: { part: CompactionPart; isExpanded?: boolean }) {
  return (
    <PreviewLayout
      icon={Minimize2}
      preview="Messages compacted"
      badge={part.auto ? 'auto' : undefined}
      isExpanded={isExpanded}
    />
  )
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export const PartPreview = memo(function PartPreview({
  part,
  isStreaming,
  isExpanded,
  className,
}: PartPreviewProps) {
  switch (part.type) {
    case 'text':
      return (
        <div className={className}>
          <TextPreview part={part} isStreaming={isStreaming} isExpanded={isExpanded} />
        </div>
      )

    case 'reasoning':
      return (
        <div className={className}>
          <ReasoningPreview part={part} isStreaming={isStreaming} isExpanded={isExpanded} />
        </div>
      )

    case 'tool':
      return (
        <div className={className}>
          <ToolPreview part={part} isStreaming={isStreaming} isExpanded={isExpanded} />
        </div>
      )

    case 'file':
      return (
        <div className={className}>
          <FilePreview part={part} isExpanded={isExpanded} />
        </div>
      )

    case 'patch':
      return (
        <div className={className}>
          <PatchPreview part={part} isExpanded={isExpanded} />
        </div>
      )

    case 'agent':
      return (
        <div className={className}>
          <AgentPreview part={part} isExpanded={isExpanded} />
        </div>
      )

    case 'subtask':
      return (
        <div className={className}>
          <SubtaskPreview part={part} isExpanded={isExpanded} />
        </div>
      )

    case 'retry':
      return (
        <div className={className}>
          <RetryPreview part={part} isExpanded={isExpanded} />
        </div>
      )

    case 'compaction':
      return (
        <div className={className}>
          <CompactionPreview part={part} isExpanded={isExpanded} />
        </div>
      )

    // Hidden parts (not rendered as visible elements)
    case 'step-start':
    case 'step-finish':
    case 'snapshot':
      return null

    default: {
      // Fallback for unknown part types
      console.warn('Unknown part type for preview:', (part as { type: string }).type)
      return (
        <div className={className}>
          <PreviewLayout
            icon={AlertTriangle}
            isExpanded={isExpanded}
            preview={`Unknown: ${(part as { type: string }).type}`}
          />
        </div>
      )
    }
  }
})
