'use client'

import {
  cloneElement,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react'

import { useContextMenu } from '@/hooks/useContextMenu'

import { Menu, MenuItem } from './menu'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: ReactNode
  shortcut?: string
  disabled?: boolean
  onAction?: () => void
}

export type ContextMenuTriggerProps = {
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
  'aria-haspopup'?: string
  'aria-expanded'?: boolean
}

export interface ContextMenuProps {
  items: ContextMenuItem[]
  children: ReactElement<ContextMenuTriggerProps>
  ariaLabel?: string
}

export function ContextMenu({ items, children, ariaLabel = 'Context menu' }: ContextMenuProps) {
  const { isOpen, position, open, close } = useContextMenu()

  const trigger = cloneElement(children, {
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      if (typeof children.props.onContextMenu === 'function') {
        children.props.onContextMenu(event)
      }

      if (event.defaultPrevented) {
        return
      }

      event.preventDefault()
      open({ x: event.clientX, y: event.clientY })
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (typeof children.props.onKeyDown === 'function') {
        children.props.onKeyDown(event)
      }

      if (event.defaultPrevented) {
        return
      }

      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        event.preventDefault()
        const rect = event.currentTarget.getBoundingClientRect()
        open({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      }
    },
    'aria-haspopup': 'menu',
    'aria-expanded': isOpen,
  })

  return (
    <>
      {trigger}
      {isOpen ? (
        <div className="fixed z-50" style={{ left: position.x, top: position.y }}>
          <Menu
            onClose={close}
            aria-label={ariaLabel}
            popover={false}
            onPointerDown={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            {items.map((item) => (
              <MenuItem
                key={item.id}
                icon={item.icon}
                shortcut={item.shortcut}
                isDisabled={item.disabled}
                onAction={() => {
                  item.onAction?.()
                  close()
                }}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </div>
      ) : null}
    </>
  )
}
