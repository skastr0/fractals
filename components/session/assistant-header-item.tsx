'use client'

import { memo } from 'react'

import { useAgentColors } from '@/context/AgentColorProvider'
import { hexToHsl } from '@/lib/graph/depth-styles'
import type { AssistantHeaderItem as AssistantHeaderFlatItem } from '@/lib/session/flat-items'

interface AssistantHeaderItemProps {
  item: AssistantHeaderFlatItem
}

export const AssistantHeaderItem = memo(function AssistantHeaderItem({
  item,
}: AssistantHeaderItemProps) {
  const { message } = item
  const { getAgentColor } = useAgentColors()
  const agentColor = message.agent ? getAgentColor(message.agent) : undefined

  return (
    <div className="flex items-center gap-2 border-b border-border/20 px-4 py-2.5">
      {/* Primary: Agent name with color, or model as fallback */}
      {message.agent ? (
        <span
          className="rounded-sm px-1.5 py-0.5 text-sm font-medium"
          style={
            agentColor
              ? {
                  backgroundColor: `${hexToHsl(agentColor).replace(')', ' / 0.15)')}`,
                  color: hexToHsl(agentColor),
                }
              : undefined
          }
        >
          {message.agent}
        </span>
      ) : null}

      {/* Secondary: Model info */}
      <span className="text-xs text-muted-foreground">
        {message.providerID}/{message.modelID}
      </span>

      {/* Finish status badge */}
      {message.finish ? (
        <span className="ml-auto rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-500">
          {message.finish}
        </span>
      ) : null}
    </div>
  )
})
