'use client'

import { Menu, MenuItem } from '@/components/ui/menu'
import { cn } from '@/lib/utils'
import type { CommandDefinition } from '@/types'

const getCommandId = (command: CommandDefinition): string =>
  command.source === 'sdk' ? command.name : command.id

const getCommandLabel = (command: CommandDefinition): string => {
  if (command.source === 'sdk') {
    return command.name.startsWith('/') ? command.name : `/${command.name}`
  }
  return command.label
}

const getCommandDescription = (command: CommandDefinition): string | null => {
  const description = command.description?.trim()
  return description ? description : null
}

const getCommandHint = (command: CommandDefinition): string | null => {
  if (command.source !== 'sdk') {
    return null
  }

  const template = command.template?.trim()
  if (!template) {
    return null
  }

  if (template === command.name) {
    return null
  }

  return template
}

export interface CommandAutocompleteProps {
  commands: CommandDefinition[]
  activeIndex: number
  onActiveChange?: (index: number) => void
  onSelect: (command: CommandDefinition) => void
  isLoading?: boolean
  emptyMessage?: string
  loadingMessage?: string
  ariaLabel?: string
  className?: string
  popoverClassName?: string
}

export function CommandAutocomplete({
  commands,
  activeIndex,
  onActiveChange,
  onSelect,
  isLoading = false,
  emptyMessage = 'No commands found.',
  loadingMessage = 'Loading commands...',
  ariaLabel = 'Command suggestions',
  className,
  popoverClassName,
}: CommandAutocompleteProps) {
  const showStatus = commands.length === 0
  const statusMessage = isLoading ? loadingMessage : emptyMessage

  return (
    <Menu
      aria-label={ariaLabel}
      className={className}
      popover={false}
      popoverClassName={popoverClassName}
    >
      {showStatus
        ? [
            <MenuItem
              key="status"
              id="status"
              isDisabled
              textValue={statusMessage}
              className="justify-center text-muted-foreground"
            >
              {statusMessage}
            </MenuItem>,
          ]
        : commands.map((command, index) => {
            const id = getCommandId(command)
            const label = getCommandLabel(command)
            const description = getCommandDescription(command)
            const hint = getCommandHint(command)
            const shortcut = command.shortcut?.trim()
            const isActive = index === activeIndex

            return (
              <MenuItem
                key={id}
                id={id}
                textValue={label}
                shortcut={shortcut}
                onAction={() => onSelect(command)}
                onPointerEnter={() => onActiveChange?.(index)}
                className={cn('items-start gap-3 py-2', isActive && 'bg-primary/10 text-primary')}
              >
                <div className="flex flex-col gap-0.5">
                  <span className={cn('font-medium text-foreground', isActive && 'text-primary')}>
                    {label}
                  </span>
                  {description ? (
                    <span
                      className={cn(
                        'line-clamp-2 text-xs text-muted-foreground',
                        isActive && 'text-primary/70',
                      )}
                    >
                      {description}
                    </span>
                  ) : null}
                  {hint ? (
                    <span
                      className={cn(
                        'line-clamp-2 text-[10px] text-muted-foreground',
                        isActive && 'text-primary/60',
                      )}
                    >
                      {hint}
                    </span>
                  ) : null}
                </div>
              </MenuItem>
            )
          })}
    </Menu>
  )
}
