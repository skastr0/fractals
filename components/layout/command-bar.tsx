'use client'

import { FolderOpen, Plus, Settings } from 'lucide-react'
import { tv } from 'tailwind-variants'

import { Button } from '@/components/ui/button'
import { usePanes } from '@/context/PanesProvider'
import type { PaneType } from '@/types'

const commandBar = tv({
  base: [
    'pointer-events-auto flex items-center gap-2 rounded-full border border-border',
    'bg-background/80 p-2 shadow-lg backdrop-blur-sm',
  ],
  variants: {
    mode: {
      center: 'absolute bottom-6 left-1/2 -translate-x-1/2',
      left: 'absolute bottom-6 left-6 flex-col',
    },
  },
  defaultVariants: {
    mode: 'center',
  },
})

interface CommandBarProps {
  mode?: 'center' | 'left'
}

const placeholderPane = (title: string) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
    <span className="text-xs uppercase tracking-wide">{title}</span>
    <span>Coming soon</span>
  </div>
)

export function CommandBar({ mode = 'center' }: CommandBarProps) {
  const panes$ = usePanes()

  const openPlaceholderPane = (type: PaneType, title: string) => {
    panes$.openPane({
      type,
      title,
      component: placeholderPane(title),
    })
  }

  const actions = [
    {
      icon: Plus,
      label: 'New Session',
      onPress: () => openPlaceholderPane('session', 'Session'),
    },
    {
      icon: FolderOpen,
      label: 'Open Project',
      onPress: () => openPlaceholderPane('project', 'Projects'),
    },
    {
      icon: Settings,
      label: 'Configuration',
      onPress: () => openPlaceholderPane('config', 'Configuration'),
    },
  ]

  return (
    <div className={commandBar({ mode })}>
      {actions.map(({ icon: Icon, label, onPress }) => (
        <Button key={label} variant="ghost" size="icon" onPress={onPress} aria-label={label}>
          <Icon className="h-5 w-5" />
        </Button>
      ))}
    </div>
  )
}
