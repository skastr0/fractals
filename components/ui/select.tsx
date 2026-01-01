'use client'

import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Select as AriaSelect,
  type SelectProps as AriaSelectProps,
  ListBox,
  ListBoxItem,
  type ListBoxItemProps,
  Popover,
  Button as SelectButton,
  SelectValue,
} from 'react-aria-components'
import { tv } from 'tailwind-variants'

import { Label } from './label'

const selectStyles = tv({
  slots: {
    root: 'flex flex-col gap-1.5',
    label: 'text-sm font-medium text-foreground',
    trigger: [
      'flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm',
      'text-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:cursor-not-allowed disabled:opacity-50',
    ],
    value: 'text-left',
    icon: 'ml-2 h-4 w-4 text-muted-foreground',
    popover:
      'w-[--trigger-width] overflow-hidden rounded-md border border-border bg-background shadow-lg',
    listbox: 'max-h-60 overflow-auto p-1',
    item: [
      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm',
      'text-foreground outline-none transition-colors',
      'focused:bg-accent focused:text-accent-foreground',
      'selected:bg-primary/10',
      'disabled:cursor-not-allowed disabled:opacity-50',
    ],
    itemIndicator: 'absolute right-2 h-4 w-4 text-primary',
  },
})

export interface SelectProps<T extends object> extends Omit<AriaSelectProps<T>, 'children'> {
  label?: string
  items: Iterable<T>
  children: (item: T) => ReactNode
  className?: string
}

export function Select<T extends object>({
  label,
  items,
  children,
  className,
  ...props
}: SelectProps<T>) {
  const styles = selectStyles()

  return (
    <AriaSelect className={styles.root({ className })} {...props}>
      {label ? <Label className={styles.label()}>{label}</Label> : null}
      <SelectButton className={styles.trigger()}>
        <SelectValue className={styles.value()} />
        <ChevronDown className={styles.icon()} aria-hidden="true" />
      </SelectButton>
      <Popover className={styles.popover()}>
        <ListBox className={styles.listbox()} items={items}>
          {children}
        </ListBox>
      </Popover>
    </AriaSelect>
  )
}

export interface SelectItemProps extends Omit<ListBoxItemProps, 'children'> {
  children: ReactNode
  className?: string
}

export function SelectItem({ children, className, ...props }: SelectItemProps) {
  const styles = selectStyles()

  return (
    <ListBoxItem {...props} className={styles.item({ className })}>
      {({ isSelected }) => (
        <>
          {children}
          {isSelected ? <Check className={styles.itemIndicator()} aria-hidden="true" /> : null}
        </>
      )}
    </ListBoxItem>
  )
}
