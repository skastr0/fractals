'use client'

import { GitFork, Loader2, Redo2, Undo2 } from 'lucide-react'
import { memo, useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { usePanes } from '@/context/PanesProvider'
import { useSession } from '@/hooks/useSession'
import { sessionService } from '@/lib/opencode/sessions'

interface ForkControlsProps {
  sessionId: string
  messageId: string
}

export const ForkControls = memo(function ForkControls({
  sessionId,
  messageId,
}: ForkControlsProps) {
  const { fork } = useSession(sessionId)
  const panes$ = usePanes()
  const [isForking, setIsForking] = useState(false)

  const handleFork = useCallback(async () => {
    if (isForking) {
      return
    }

    setIsForking(true)

    try {
      const newSession = await fork(messageId)
      const title = newSession.title?.trim() || 'Forked Session'
      const { SessionPane } = await import('@/components/panes/session-pane')
      const paneContent = <SessionPane sessionId={newSession.id} />

      const hasSessionPane = panes$.panes.get().some((pane) => pane.id === 'session')

      if (hasSessionPane) {
        panes$.stackPane('session', paneContent)
        panes$.setPaneTitle('session', title)
      } else {
        panes$.openPane({ type: 'session', component: paneContent, title })
      }
    } finally {
      setIsForking(false)
    }
  }, [fork, isForking, messageId, panes$])

  return (
    <Button
      variant="ghost"
      size="icon"
      onPress={handleFork}
      isDisabled={isForking}
      aria-label="Fork from this message"
    >
      {isForking ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitFork className="h-4 w-4" />}
    </Button>
  )
})

interface RevertControlsProps {
  sessionId: string
}

export const RevertControls = memo(function RevertControls({ sessionId }: RevertControlsProps) {
  const { session, messages, isWorking } = useSession(sessionId)
  const [isUpdating, setIsUpdating] = useState(false)

  const userMessages = messages.filter((message) => message.role === 'user')
  const canUndo = userMessages.length > 0 && !isWorking && !isUpdating
  const canRedo = Boolean(session?.revert?.messageID) && !isWorking && !isUpdating

  const handleUndo = useCallback(async () => {
    if (!canUndo) {
      return
    }

    const lastUserMessage = userMessages[userMessages.length - 1]
    if (!lastUserMessage) {
      return
    }

    setIsUpdating(true)
    try {
      await sessionService.revert(sessionId, lastUserMessage.id)
    } finally {
      setIsUpdating(false)
    }
  }, [canUndo, sessionId, userMessages])

  const handleRedo = useCallback(async () => {
    if (!canRedo) {
      return
    }

    setIsUpdating(true)
    try {
      await sessionService.unrevert(sessionId)
    } finally {
      setIsUpdating(false)
    }
  }, [canRedo, sessionId])

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onPress={handleUndo}
        isDisabled={!canUndo}
        aria-label="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onPress={handleRedo}
        isDisabled={!canRedo}
        aria-label="Redo"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  )
})
