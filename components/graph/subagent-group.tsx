'use client'

import type { Node, NodeProps } from '@xyflow/react'
import { memo } from 'react'

import { getAccentColor, getGroupTint } from '@/lib/graph/depth-styles'
import type { SubagentGroupData } from '@/types'

type SubagentGroupNode = Node<SubagentGroupData, 'subagentGroup'>

export const SubagentGroup = memo(function SubagentGroup({ data }: NodeProps<SubagentGroupNode>) {
  // SubagentGroup is a visual container for subagents at a certain depth
  // Currently uses depth-based colors since we don't have agent info at this level
  // Future enhancement: pass agentColor through SubagentGroupData if needed
  const borderColor = getAccentColor(undefined, data.depth)
  const backgroundColor = getGroupTint(undefined, data.depth)

  return (
    <div
      className="pointer-events-none h-full w-full rounded-xl border border-dashed"
      style={{ borderColor, backgroundColor, opacity: 0.3 }}
    />
  )
})
