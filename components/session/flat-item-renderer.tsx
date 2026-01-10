'use client'

import { memo } from 'react'

import type { FlatItem } from '@/lib/session/flat-items'

import { AssistantHeaderItem } from './assistant-header-item'
import { PartItem } from './part-item'
import { UserMessageItem } from './user-message-item'

interface FlatItemRendererProps {
  item: FlatItem
  sessionKey: string
  forkCount?: number
  isExpanded: boolean
  onToggle: () => void
}

export const FlatItemRenderer = memo(function FlatItemRenderer({
  item,
  sessionKey,
  forkCount,
  isExpanded,
  onToggle,
}: FlatItemRendererProps) {
  switch (item.type) {
    case 'user-message':
      return <UserMessageItem item={item} sessionKey={sessionKey} forkCount={forkCount} />

    case 'assistant-header':
      return <AssistantHeaderItem item={item} />

    case 'part':
      return <PartItem item={item} isExpanded={isExpanded} onToggle={onToggle} />

    default:
      return null
  }
})
