'use client'

import { Check, ChevronDown } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import {
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  type MenuProps as AriaMenuProps,
  MenuTrigger,
  Popover,
  Separator,
} from 'react-aria-components'
import { tv } from 'tailwind-variants'

import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from './button'

const menuStyles = tv({
  slots: {
    popover: [
      'min-w-[8rem] overflow-hidden rounded-md border border-border bg-background p-1 shadow-lg',
      'data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95',
      'data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95',
    ],
    menu: 'max-h-72 overflow-auto outline-none',
    item: [
      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm',
      'text-foreground outline-none transition-colors',
      'focused:bg-accent focused:text-accent-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    ],
    label: 'flex-1',
    trailing: 'ml-auto flex items-center gap-2',
    shortcut: 'text-xs tracking-widest text-muted-foreground',
    icon: 'h-4 w-4 text-muted-foreground',
    check: 'h-4 w-4 text-primary',
    separator: '-mx-1 my-1 h-px bg-border',
  },
})

export interface MenuProps<T extends object> extends AriaMenuProps<T> {
  className?: string
  popoverClassName?: string
  popover?: boolean
}

export function Menu<T extends object>({
  className,
  popoverClassName,
  popover = true,
  ...props
}: MenuProps<T>) {
  const styles = menuStyles()

  if (!popover) {
    return (
      <div className={styles.popover({ className: popoverClassName })}>
        <AriaMenu className={styles.menu({ className })} {...props} />
      </div>
    )
  }

  return (
    <Popover className={styles.popover({ className: popoverClassName })}>
      <AriaMenu className={styles.menu({ className })} {...props} />
    </Popover>
  )
}

type AriaMenuItemChildren = ComponentProps<typeof AriaMenuItem>['children']

export interface MenuItemProps extends Omit<ComponentProps<typeof AriaMenuItem>, 'children'> {
  children: AriaMenuItemChildren
  icon?: ReactNode
  shortcut?: string
  className?: string
}

export function MenuItem({ icon, shortcut, className, children, ...props }: MenuItemProps) {
  const styles = menuStyles()

  return (
    <AriaMenuItem className={styles.item({ className })} {...props}>
      {(renderProps) => {
        const content = typeof children === 'function' ? children(renderProps) : children
        const showTrailing = Boolean(shortcut || renderProps.isSelected)

        return (
          <>
            {icon ? <span className={styles.icon()}>{icon}</span> : null}
            <span className={styles.label()}>{content}</span>
            {showTrailing ? (
              <span className={styles.trailing()}>
                {shortcut ? <span className={styles.shortcut()}>{shortcut}</span> : null}
                {renderProps.isSelected ? (
                  <Check className={styles.check()} aria-hidden="true" />
                ) : null}
              </span>
            ) : null}
          </>
        )
      }}
    </AriaMenuItem>
  )
}

export function MenuSeparator() {
  const styles = menuStyles()
  return <Separator className={styles.separator()} />
}

export interface MenuButtonProps extends Omit<ButtonProps, 'children'> {
  children: ReactNode
  showChevron?: boolean
}

export function MenuButton({ showChevron = true, className, children, ...props }: MenuButtonProps) {
  return (
    <Button className={cn('gap-2', className)} {...props}>
      {children}
      {showChevron ? (
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      ) : null}
    </Button>
  )
}

export { MenuTrigger }
