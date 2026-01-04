'use client'

import type { Node, NodeProps } from '@xyflow/react'
import { memo } from 'react'

import { getDepthAccentColor, getDepthGroupTint } from '@/lib/graph/depth-styles'
import type { SubagentGroupData } from '@/types'

type SubagentGroupNode = Node<SubagentGroupData, 'subagentGroup'>

export const SubagentGroup = memo(function SubagentGroup({ data }: NodeProps<SubagentGroupNode>) {
  const borderColor = getDepthAccentColor(data.depth)
  const backgroundColor = getDepthGroupTint(data.depth)

  return (
    <div
      className="pointer-events-none h-full w-full rounded-xl border border-dashed"
      style={{ borderColor, backgroundColor, opacity: 0.3 }}
    />
  )
})
