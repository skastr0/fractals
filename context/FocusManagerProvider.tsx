'use client'

import { useObservable } from '@legendapp/state/react'
import { createContext, type ReactNode, useCallback, useContext, useEffect } from 'react'

export type FocusArea = 'graph' | 'pane' | 'input' | 'dialog' | 'none'

export type FocusContext = {
  area: FocusArea
  paneId?: string
  elementId?: string
  inputType?: 'text' | 'textarea' | 'select' | 'contenteditable'
}

export interface FocusManagerContextValue {
  focusContext$: ReturnType<typeof useObservable<FocusContext>>
  setFocusContext: (context: Partial<FocusContext>) => void
  isInputFocused: () => boolean
  isPaneFocused: () => boolean
  isGraphFocused: () => boolean
  canTriggerGlobalShortcuts: () => boolean
}

const FocusManagerContext = createContext<FocusManagerContextValue | null>(null)

export function useFocusManager(): FocusManagerContextValue {
  const context = useContext(FocusManagerContext)
  if (!context) {
    throw new Error('useFocusManager must be used within FocusManagerProvider')
  }
  return context
}

export function FocusManagerProvider({ children }: { children: ReactNode }) {
  const focusContext$ = useObservable<FocusContext>({
    area: 'none',
  })

  const setFocusContext = useCallback(
    (context: Partial<FocusContext>) => {
      focusContext$.assign(context)
    },
    [focusContext$],
  )

  // V3: Use peek() for imperative checks (called from event handlers, not render)
  const isInputFocused = () => focusContext$.area.peek() === 'input'
  const isPaneFocused = () => focusContext$.area.peek() === 'pane'
  const isGraphFocused = () => focusContext$.area.peek() === 'graph'
  const canTriggerGlobalShortcuts = () => {
    const area = focusContext$.area.peek()
    return area === 'graph' || area === 'none'
  }

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) {
        return
      }

      const inputTags = ['input', 'textarea', 'select']
      const tagName = target.tagName.toLowerCase()
      const isContentEditable =
        target.isContentEditable || target.getAttribute('contenteditable') === 'true'

      if (inputTags.includes(tagName) || isContentEditable) {
        let inputType: FocusContext['inputType'] = 'text'
        if (isContentEditable) {
          inputType = 'contenteditable'
        } else if (tagName === 'textarea') {
          inputType = 'textarea'
        } else if (tagName === 'select') {
          inputType = 'select'
        }

        setFocusContext({
          area: 'input',
          elementId: target.id || undefined,
          inputType,
        })
        return
      }

      const paneElement = target.closest('[data-pane-id]')
      if (paneElement) {
        setFocusContext({
          area: 'pane',
          paneId: paneElement.getAttribute('data-pane-id') || undefined,
          elementId: target.id || undefined,
        })
        return
      }

      const dialogElement = target.closest('[role="dialog"], [data-focus-area="dialog"]')
      if (dialogElement) {
        setFocusContext({
          area: 'dialog',
          elementId: target.id || undefined,
        })
        return
      }

      const graphElement = target.closest('[data-focus-area="graph"], [data-graph]')
      if (graphElement) {
        setFocusContext({
          area: 'graph',
          elementId: target.id || undefined,
        })
        return
      }

      setFocusContext({
        area: 'none',
        elementId: target.id || undefined,
      })
    }

    const handleFocusOut = () => {
      setTimeout(() => {
        if (!document.activeElement || document.activeElement === document.body) {
          setFocusContext({ area: 'none' })
        }
      }, 10)
    }

    const handleClick = (event: MouseEvent) => {
      handleFocusIn({ target: event.target } as FocusEvent)
    }

    document.addEventListener('focusin', handleFocusIn, true)
    document.addEventListener('focusout', handleFocusOut, true)
    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true)
      document.removeEventListener('focusout', handleFocusOut, true)
      document.removeEventListener('click', handleClick, true)
    }
  }, [setFocusContext])

  const value: FocusManagerContextValue = {
    focusContext$,
    setFocusContext,
    isInputFocused,
    isPaneFocused,
    isGraphFocused,
    canTriggerGlobalShortcuts,
  }

  return <FocusManagerContext.Provider value={value}>{children}</FocusManagerContext.Provider>
}
