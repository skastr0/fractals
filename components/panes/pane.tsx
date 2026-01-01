'use client'

import { ChevronLeft, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { tv } from 'tailwind-variants'

import { Button } from '@/components/ui/button'

const paneVariants = tv({
  slots: {
    root: [
      'flex h-full min-w-0 flex-shrink-0 flex-col rounded-lg border border-border',
      'bg-background/95 backdrop-blur-sm shadow-lg',
      'overflow-hidden',
      'transition-[width,opacity,transform] duration-200 ease-out',
      'data-[state=open]:animate-in data-[state=open]:fade-in',
      'data-[state=open]:slide-in-from-right-2',
      'data-[state=closing]:animate-out data-[state=closing]:fade-out',
      'data-[state=closing]:slide-out-to-right-2',
    ],
    header: [
      'flex items-center justify-between gap-2 px-4 py-3',
      'border-b border-border bg-background/50',
    ],
    title: 'text-sm font-medium text-foreground truncate',
    actions: 'flex items-center gap-1',
    content: 'flex-1 min-h-0 overflow-auto',
  },
})

export interface PaneProps {
  id: string
  title: string
  width: number
  isStacked?: boolean
  isClosing?: boolean
  onClose: () => void
  onUnstack?: () => void
  children: ReactNode
}

export function Pane({
  id,
  title,
  width,
  isStacked,
  isClosing,
  onClose,
  onUnstack,
  children,
}: PaneProps) {
  const styles = paneVariants()
  const state = isClosing ? 'closing' : 'open'

  return (
    <section
      className={styles.root()}
      style={{ width: `${width}%` }}
      data-pane-id={id}
      data-state={state}
      aria-label={title}
    >
      <div className={styles.header()}>
        <div className="flex min-w-0 items-center gap-2">
          {isStacked && onUnstack ? (
            <Button aria-label="Back" variant="ghost" size="icon" onPress={onUnstack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : null}
          <h3 className={styles.title()}>{title}</h3>
        </div>
        <div className={styles.actions()}>
          <Button aria-label="Close" variant="ghost" size="icon" onPress={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className={styles.content()}>{children}</div>
    </section>
  )
}
