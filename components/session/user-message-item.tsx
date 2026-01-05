'use client'

import { GitFork, User } from 'lucide-react'
import { memo } from 'react'
import type { UserMessageItem as UserMessageFlatItem } from '@/lib/session/flat-items'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/date'

import { ForkControls } from './fork-controls'

interface UserMessageItemProps {
  item: UserMessageFlatItem
  sessionKey: string
  forkCount?: number
  isActive?: boolean
}

export const UserMessageItem = memo(function UserMessageItem({
  item,
  sessionKey,
  forkCount = 0,
  isActive,
}: UserMessageItemProps) {
  const { message } = item

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        'flex items-start gap-3 px-4 py-3',
        'border-b border-border/20',
        'transition-colors',
        isActive && 'bg-primary/5',
        item.isFirstInTurn && 'pt-4',
      )}
    >
      {/* Avatar */}
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
        <User className="h-3.5 w-3.5 text-primary" />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-sm font-medium text-foreground">You</span>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(message.time.created)}
        </span>
        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
          {message.agent}
        </span>
        <span className="text-xs text-muted-foreground">
          {message.model.providerID}/{message.model.modelID}
        </span>
        {forkCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <GitFork className="h-3 w-3" />
            {forkCount}
          </span>
        ) : null}
        <span className="ml-auto">
          <ForkControls sessionKey={sessionKey} messageId={message.id} />
        </span>
      </div>
    </div>
  )
})
