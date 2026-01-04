'use client'

import { GitFork, Loader2, Redo2, Undo2 } from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useOpenCode } from '@/context/OpenCodeProvider'
import { usePanes } from '@/context/PanesProvider'
import { useProject } from '@/context/ProjectProvider'
import { useSession } from '@/hooks/useSession'
import { buildSessionKey, resolveSessionKey } from '@/lib/utils/session-key'

interface ForkControlsProps {
  sessionKey: string
  messageId: string
}

export const ForkControls = memo(function ForkControls({
  sessionKey,
  messageId,
}: ForkControlsProps) {
  const { fork } = useSession(sessionKey)
  const { currentProject, projects } = useProject()
  const panes$ = usePanes()
  const [isForking, setIsForking] = useState(false)

  const sessionLookup = useMemo(() => {
    const resolved = resolveSessionKey(sessionKey, projects)
    if (resolved) {
      return { sessionKey, ...resolved }
    }

    if (!currentProject) {
      return null
    }

    const fallbackKey = buildSessionKey(currentProject.worktree, sessionKey)
    const fallback = resolveSessionKey(fallbackKey, projects)
    if (!fallback) {
      return null
    }

    return { sessionKey: fallbackKey, ...fallback }
  }, [currentProject, projects, sessionKey])

  const handleFork = useCallback(async () => {
    if (isForking) {
      return
    }

    setIsForking(true)

    try {
      const newSession = await fork(messageId)
      const title = newSession.title?.trim() || 'Forked Session'
      const directory = sessionLookup?.directory ?? currentProject?.worktree
      const newSessionKey = directory ? buildSessionKey(directory, newSession.id) : newSession.id
      const { SessionPane } = await import('@/components/panes/session-pane')
      const paneContent = <SessionPane sessionKey={newSessionKey} />

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
  }, [currentProject?.worktree, fork, isForking, messageId, panes$, sessionLookup?.directory])

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
  sessionKey: string
}

export const RevertControls = memo(function RevertControls({ sessionKey }: RevertControlsProps) {
  const { session, messages, isWorking } = useSession(sessionKey)
  const { client } = useOpenCode()
  const { currentProject, projects } = useProject()
  const [isUpdating, setIsUpdating] = useState(false)

  const sessionLookup = useMemo(() => {
    const resolved = resolveSessionKey(sessionKey, projects)
    if (resolved) {
      return { sessionKey, ...resolved }
    }

    if (!currentProject) {
      return null
    }

    const fallbackKey = buildSessionKey(currentProject.worktree, sessionKey)
    const fallback = resolveSessionKey(fallbackKey, projects)
    if (!fallback) {
      return null
    }

    return { sessionKey: fallbackKey, ...fallback }
  }, [currentProject, projects, sessionKey])

  const userMessages = messages.filter((message) => message.role === 'user')
  const canUndo = userMessages.length > 0 && !isWorking && !isUpdating
  const canRedo = Boolean(session?.revert?.messageID) && !isWorking && !isUpdating

  const handleUndo = useCallback(async () => {
    if (!canUndo || !client || !sessionLookup) {
      return
    }

    const lastUserMessage = userMessages[userMessages.length - 1]
    if (!lastUserMessage) {
      return
    }

    setIsUpdating(true)
    try {
      await client.session.revert(
        {
          sessionID: sessionLookup.sessionId,
          messageID: lastUserMessage.id,
          directory: sessionLookup.directory,
        },
        { throwOnError: true },
      )
    } finally {
      setIsUpdating(false)
    }
  }, [canUndo, client, sessionLookup, userMessages])

  const handleRedo = useCallback(async () => {
    if (!canRedo || !client || !sessionLookup) {
      return
    }

    setIsUpdating(true)
    try {
      await client.session.unrevert(
        { sessionID: sessionLookup.sessionId, directory: sessionLookup.directory },
        { throwOnError: true },
      )
    } finally {
      setIsUpdating(false)
    }
  }, [canRedo, client, sessionLookup])

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
