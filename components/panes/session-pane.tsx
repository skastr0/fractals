'use client'

import { RevertControls } from '@/components/session/fork-controls'
import { MessageList } from '@/components/session/message-list'
import { SessionInput } from '@/components/session/session-input'
import { SessionStatusBadge } from '@/components/ui/session-status-badge'
import { useSession } from '@/hooks/useSession'
import { useSessionStatus } from '@/hooks/useSessionStatus'
import { formatRelativeTime } from '@/lib/utils/date'

interface SessionPaneProps {
  sessionId: string
}

export function SessionPane({ sessionId }: SessionPaneProps) {
  const { session } = useSession(sessionId)
  const status = useSessionStatus(sessionId)
  const title = session?.title?.trim() || 'Session'
  const updatedAt = session?.time.updated ?? Date.now()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{formatRelativeTime(updatedAt)}</div>
        </div>
        <div className="flex items-center gap-2">
          <SessionStatusBadge status={status} />
          <RevertControls sessionId={sessionId} />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <MessageList sessionId={sessionId} />
      </div>
      <div className="border-t border-border p-4">
        <SessionInput sessionId={sessionId} />
      </div>
    </div>
  )
}
