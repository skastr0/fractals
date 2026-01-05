'use client'

import { ChevronDown } from 'lucide-react'
import { memo } from 'react'
import type { PartItem as PartFlatItem } from '@/lib/session/flat-items'
import { cn } from '@/lib/utils'

import { PartPreview } from './part-preview'
import { PartRenderer } from './part-renderer'

interface PartItemProps {
  item: PartFlatItem
  isExpanded: boolean
  onToggle: () => void
}

export const PartItem = memo(function PartItem({ item, isExpanded, onToggle }: PartItemProps) {
  const isTextPart = item.part.type === 'text'

  // For text parts when expanded, just show the content directly (no preview header)
  // For other parts, show preview as collapsible header
  if (isTextPart && isExpanded) {
    return (
      <div className={cn('border-b border-border/20', item.isLastInTurn && 'mb-2')}>
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-muted-foreground hover:bg-muted/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={isExpanded}
        >
          <ChevronDown className="h-3 w-3" />
          <span>Collapse</span>
        </button>
        <div className="px-4 py-3 pl-10">
          <PartRenderer part={item.part} isAssistant={item.isAssistant} />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('border-b border-border/20', item.isLastInTurn && 'mb-2')}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-expanded={isExpanded}
      >
        <PartPreview
          part={item.part}
          isStreaming={item.isStreaming}
          isExpanded={isExpanded}
          className="pl-10"
        />
      </button>

      {isExpanded && (
        <div className="border-t border-border/10 bg-muted/20 px-4 py-3 pl-14">
          <PartRenderer part={item.part} isAssistant={item.isAssistant} />
        </div>
      )}
    </div>
  )
})
