'use client'

import type { Observable } from '@legendapp/state'
import { useObservable } from '@legendapp/state/react'
import { createContext, type ReactNode, useContext } from 'react'
import type { PaneId, PaneType } from '@/types'

export type Pane = {
  id: PaneId
  type: PaneType
  number: number
  title: string
  widthPercentage: number
  components: ReactNode[]
  /** Content to render in header after title */
  headerContent?: ReactNode
  /** Actions to render before close button */
  headerActions?: ReactNode
}

export type PanesContextValue = Observable<{
  panes: Pane[]
  openPane: (options: {
    type: PaneType
    component: ReactNode
    title?: string
    headerContent?: ReactNode
    headerActions?: ReactNode
  }) => void
  setPaneTitle: (id: PaneId, title: string) => void
  closePane: (id: PaneId) => void
  closeMostRecentPane: () => void
  canOpenNewPane: (type?: PaneType) => boolean
  stackPane: (id: PaneId, component: ReactNode) => void
  unstackPaneOnce: (id: PaneId) => void
  getTotalPaneWidthPercentage: () => number
}>

const SINGLETON_PANE_TYPES: PaneType[] = ['session', 'config', 'project', 'metadata']
const DEFAULT_PANE_WIDTH_PERCENTAGE = 15

// Helper to check if a new pane can be opened (pure function, no observables)
const checkCanOpenNewPane = (currentPanes: Pane[], type?: PaneType): boolean => {
  if (type === 'session') {
    return true
  }

  const nonSessionCount = currentPanes.filter((pane) => pane.type !== 'session').length
  if (nonSessionCount >= 3) {
    return false
  }

  if (currentPanes.length >= 4) {
    return false
  }

  return true
}

const PanesContext = createContext<PanesContextValue | null>(null)

export function usePanes(): PanesContextValue {
  const context = useContext(PanesContext)
  if (!context) {
    throw new Error('usePanes must be used within a PanesProvider')
  }
  return context
}

export function PanesProvider({ children }: { children: ReactNode }) {
  const state$ = useObservable({
    panes: [] as Pane[],
    // V3: Use peek() instead of get() in imperative actions to avoid subscriptions
    openPane: ({
      type,
      component,
      title,
      headerContent,
      headerActions,
    }: {
      type: PaneType
      component: ReactNode
      title?: string
      headerContent?: ReactNode
      headerActions?: ReactNode
    }) => {
      const currentPanes = state$.panes.peek()
      const defaultTitle = title ?? type.charAt(0).toUpperCase() + type.slice(1)

      if (SINGLETON_PANE_TYPES.includes(type)) {
        const existingPane = currentPanes.find((pane) => pane.id === type)
        if (existingPane) {
          return
        }

        if (type !== 'session' && !checkCanOpenNewPane(currentPanes, type)) {
          return
        }

        const newPane: Pane = {
          id: type as PaneId,
          type,
          number: 1,
          components: [component],
          widthPercentage: DEFAULT_PANE_WIDTH_PERCENTAGE,
          title: defaultTitle,
          headerContent,
          headerActions,
        }

        if (type === 'session') {
          state$.panes.set([newPane, ...currentPanes])
        } else {
          state$.panes.set([...currentPanes, newPane])
        }
        return
      }

      if (!checkCanOpenNewPane(currentPanes, type)) {
        return
      }

      const typeCount = Math.max(
        0,
        ...currentPanes.filter((pane) => pane.type === type).map((pane) => pane.number),
      )

      const newPane: Pane = {
        id: `${type}-${typeCount + 1}` as PaneId,
        type,
        number: typeCount + 1,
        components: [component],
        widthPercentage: DEFAULT_PANE_WIDTH_PERCENTAGE,
        title: title ?? 'Tab',
        headerContent,
        headerActions,
      }

      state$.panes.set([...currentPanes, newPane])
    },
    setPaneTitle: (id: PaneId, title: string) => {
      const currentPanes = state$.panes.peek()
      const paneIndex = currentPanes.findIndex((pane) => pane.id === id)
      if (paneIndex < 0) {
        return
      }
      const pane = state$.panes[paneIndex]
      if (!pane) {
        return
      }
      pane.title.set(title)
    },
    closePane: (id: PaneId) => {
      const currentPanes = state$.panes.peek()
      state$.panes.set(currentPanes.filter((pane) => pane.id !== id))
    },
    closeMostRecentPane: () => {
      const currentPanes = state$.panes.peek()
      if (currentPanes.length === 0) {
        return
      }
      const mostRecentPane = currentPanes[currentPanes.length - 1]
      if (!mostRecentPane) {
        return
      }
      // Inline the closePane logic to avoid observable method call
      state$.panes.set(currentPanes.filter((pane) => pane.id !== mostRecentPane.id))
    },
    stackPane: (id: PaneId, component: ReactNode) => {
      const currentPanes = state$.panes.peek()
      const paneIndex = currentPanes.findIndex((pane) => pane.id === id)
      if (paneIndex < 0) {
        return
      }
      const pane = state$.panes[paneIndex]
      if (!pane) {
        return
      }
      pane.components.set([...pane.components.peek(), component])
    },
    unstackPaneOnce: (id: PaneId) => {
      const currentPanes = state$.panes.peek()
      const paneIndex = currentPanes.findIndex((pane) => pane.id === id)
      if (paneIndex < 0) {
        return
      }
      const pane = state$.panes[paneIndex]
      if (!pane) {
        return
      }
      pane.components.set(pane.components.peek().slice(0, -1))
    },
    // V3: Use peek() for imperative reads
    canOpenNewPane: (type?: PaneType) => {
      return checkCanOpenNewPane(state$.panes.peek(), type)
    },
    getTotalPaneWidthPercentage: () => {
      const openPanes = state$.panes.peek().length
      switch (openPanes) {
        case 1:
          return 40
        case 2:
          return 55
        case 3:
          return 70
        case 4:
          return 85
        default:
          return 0
      }
    },
  })

  return <PanesContext.Provider value={state$}>{children}</PanesContext.Provider>
}
