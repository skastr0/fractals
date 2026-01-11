'use client'

import { memo } from 'react'
import type { ToolPart } from '@/lib/opencode'
import type { PartItem as PartFlatItem } from '@/lib/session/flat-items'
import { cn } from '@/lib/utils'

import { PartPreview } from './part-preview'
import { PartRenderer } from './part-renderer'
import { ToolOutputRenderer } from './parts/tool-output'

interface PartItemProps {
  item: PartFlatItem
  isExpanded: boolean
  onToggle: () => void
}

export const PartItem = memo(function PartItem({ item, isExpanded, onToggle }: PartItemProps) {
  const isTextPart = item.part.type === 'text'
  const isToolPart = item.part.type === 'tool'
  const isFilePart = item.part.type === 'file'

  // File parts: everything in the header, no expansion needed
  if (isFilePart) {
    return (
      <div className={cn(item.isLastInTurn && 'mb-1')}>
        <PartPreview part={item.part} />
      </div>
    )
  }

  // Text parts (both user and assistant) - ALL are collapsible
  if (isTextPart) {
    return (
      <div className={cn(item.isLastInTurn && 'mb-1')}>
        <button
          type="button"
          onClick={onToggle}
          className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={isExpanded}
        >
          <PartPreview part={item.part} isExpanded={isExpanded} />
        </button>
        {isExpanded && (
          <div className="py-1 pl-6 pr-2">
            <PartRenderer part={item.part} isAssistant={item.isAssistant} />
          </div>
        )}
      </div>
    )
  }

  // For tool parts - use streamlined rendering
  if (isToolPart) {
    const toolPart = item.part as ToolPart
    const editDiff =
      toolPart.tool === 'edit' && toolPart.state.status === 'completed'
        ? (toolPart.state as { metadata?: { diff?: string } }).metadata?.diff
        : undefined
    const shouldRenderOutput = isExpanded || Boolean(editDiff)

    return (
      <div className={cn(item.isLastInTurn && 'mb-1')}>
        <button
          type="button"
          onClick={onToggle}
          className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={isExpanded}
        >
          <PartPreview part={item.part} isExpanded={isExpanded} />
        </button>

        {shouldRenderOutput && (
          <div className="py-1 pl-6 pr-2">
            <ToolOutputRenderer part={toolPart} isExpanded={isExpanded} />
          </div>
        )}
      </div>
    )
  }

  // Default: other part types (reasoning, patch, agent, subtask, etc.) - ALL collapsible
  return (
    <div className={cn(item.isLastInTurn && 'mb-1')}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={isExpanded}
      >
        <PartPreview part={item.part} isExpanded={isExpanded} />
      </button>

      {isExpanded && (
        <div className="py-1 pl-6 pr-2">
          <PartRenderer part={item.part} isAssistant={item.isAssistant} />
        </div>
      )}
    </div>
  )
})
