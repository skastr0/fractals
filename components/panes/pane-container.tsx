'use client'

import { use$ } from '@legendapp/state/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useFocusManager } from '@/context/FocusManagerProvider'
import { usePanes } from '@/context/PanesProvider'
import type { PaneId } from '@/types'

import { Pane } from './pane'

const CLOSE_ANIMATION_MS = 180

interface PaneContainerProps {
  widthOverride?: number | string
}

export function PaneContainer({ widthOverride }: PaneContainerProps) {
  const panes$ = usePanes()
  const { canTriggerGlobalShortcuts } = useFocusManager()
  const panes = use$(() => panes$.panes.get())
  const totalWidth = use$(() => panes$.getTotalPaneWidthPercentage())
  const containerWidth = useMemo(() => {
    if (widthOverride === undefined || widthOverride === null) {
      return `${totalWidth}%`
    }
    if (typeof widthOverride === 'string' && !widthOverride.trim().endsWith('%')) {
      return widthOverride
    }
    return '100%'
  }, [totalWidth, widthOverride])
  const [closingPaneIds, setClosingPaneIds] = useState<Set<PaneId>>(new Set())
  const closeTimers = useRef<Record<string, number>>({})

  const paneWidth = useMemo(() => {
    if (panes.length === 0) {
      return 0
    }
    return 100 / panes.length
  }, [panes.length])

  const requestClose = useCallback(
    (id: PaneId) => {
      setClosingPaneIds((prev) => {
        if (prev.has(id)) {
          return prev
        }
        const next = new Set(prev)
        next.add(id)
        return next
      })

      if (closeTimers.current[id]) {
        window.clearTimeout(closeTimers.current[id])
      }

      closeTimers.current[id] = window.setTimeout(() => {
        panes$.closePane(id)
        setClosingPaneIds((prev) => {
          if (!prev.has(id)) {
            return prev
          }
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        delete closeTimers.current[id]
      }, CLOSE_ANIMATION_MS)
    },
    [panes$],
  )

  const handleCloseMostRecent = useCallback(() => {
    const currentPanes = panes$.panes.get()
    const mostRecent = currentPanes[currentPanes.length - 1]
    if (!mostRecent) {
      return
    }
    requestClose(mostRecent.id)
  }, [panes$, requestClose])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canTriggerGlobalShortcuts()) {
        return
      }

      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== 'q') {
        return
      }

      event.preventDefault()
      handleCloseMostRecent()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [canTriggerGlobalShortcuts, handleCloseMostRecent])

  useEffect(() => {
    if (closingPaneIds.size === 0) {
      return
    }

    const activeIds = new Set(panes.map((pane) => pane.id))

    setClosingPaneIds((prev) => {
      if (prev.size === 0) {
        return prev
      }

      let changed = false
      const next = new Set<PaneId>()
      prev.forEach((id) => {
        if (activeIds.has(id)) {
          next.add(id)
        } else {
          changed = true
          const timer = closeTimers.current[id]
          if (timer) {
            window.clearTimeout(timer)
            delete closeTimers.current[id]
          }
        }
      })

      return changed ? next : prev
    })
  }, [closingPaneIds.size, panes])

  useEffect(() => {
    return () => {
      Object.values(closeTimers.current).forEach((timer) => {
        window.clearTimeout(timer)
      })
    }
  }, [])

  if (panes.length === 0) {
    return null
  }

  return (
    <div
      className="flex h-full max-h-full min-h-0 w-full gap-2 overflow-hidden p-2"
      style={{ width: containerWidth }}
    >
      {panes.map((pane) => {
        const isStacked = pane.components.length > 1
        const activeComponent = pane.components[pane.components.length - 1] ?? null

        return (
          <Pane
            key={pane.id}
            id={pane.id}
            title={pane.title}
            width={paneWidth}
            isStacked={isStacked}
            isClosing={closingPaneIds.has(pane.id)}
            onClose={() => requestClose(pane.id)}
            onUnstack={() => panes$.unstackPaneOnce(pane.id)}
            headerContent={pane.headerContent}
            headerActions={pane.headerActions}
          >
            {activeComponent}
          </Pane>
        )
      })}
    </div>
  )
}
