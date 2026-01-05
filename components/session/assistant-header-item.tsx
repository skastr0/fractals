'use client'

import { Bot } from 'lucide-react'
import { memo } from 'react'

import type { AssistantHeaderItem as AssistantHeaderFlatItem } from '@/lib/session/flat-items'

interface AssistantHeaderItemProps {
  item: AssistantHeaderFlatItem
}

export const AssistantHeaderItem = memo(function AssistantHeaderItem({
  item,
}: AssistantHeaderItemProps) {
  const { message } = item

  return (
    <div className="flex items-center gap-3 border-b border-border/20 px-4 py-3">
      {/* Avatar */}
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
        <Bot className="h-3.5 w-3.5 text-secondary-foreground" />
      </div>

      {/* Metadata */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-sm font-medium text-foreground">Assistant</span>
        <span className="text-xs text-muted-foreground">
          {message.providerID}/{message.modelID}
        </span>
        {message.agent ? (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {message.agent}
          </span>
        ) : null}
        {message.finish ? (
          <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-500">
            {message.finish}
          </span>
        ) : null}
      </div>
    </div>
  )
})
