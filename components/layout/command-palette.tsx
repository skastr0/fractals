'use client'

import { Clock, Command, MousePointer, Plus, X, Zap } from 'lucide-react'
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useFocusManager } from '@/context/FocusManagerProvider'
import { usePanes } from '@/context/PanesProvider'
import { useSessionFilter } from '@/context/SessionFilterProvider'
import { useCommandExecutor } from '@/hooks/useCommandExecutor'
import { useCommandPaletteData } from '@/hooks/useCommandPaletteData'
import { createLocalCommandRegistry, type CommandPaletteEntry } from '@/lib/commands'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  onNewSession: () => void
  onJumpToLatest?: () => void
  onClearSelection?: () => void
  selectedSessionKey?: string | null
}

export function CommandPalette({
  onNewSession,
  onJumpToLatest,
  onClearSelection,
  selectedSessionKey,
}: CommandPaletteProps) {
  const { canTriggerGlobalShortcuts } = useFocusManager()
  const panes$ = usePanes()
  const { setFilterHours } = useSessionFilter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

  const resolveCommandIcon = useCallback((icon?: string) => {
    switch (icon) {
      case 'plus':
        return <Plus className="h-4 w-4" />
      case 'zap':
        return <Zap className="h-4 w-4" />
      case 'mouse-pointer':
        return <MousePointer className="h-4 w-4" />
      case 'x':
        return <X className="h-4 w-4" />
      case 'clock':
        return <Clock className="h-4 w-4" />
      default:
        return <Command className="h-4 w-4" />
    }
  }, [])

  const localCommands = useMemo(
    () =>
      createLocalCommandRegistry({
        onNewSession: () => {
          setIsOpen(false)
          onNewSession()
        },
        onJumpToLatest: onJumpToLatest
          ? () => {
              setIsOpen(false)
              onJumpToLatest()
            }
          : undefined,
        onClearSelection: onClearSelection
          ? () => {
              setIsOpen(false)
              onClearSelection()
            }
          : undefined,
        onCloseMostRecentPane: () => {
          setIsOpen(false)
          panes$.closeMostRecentPane()
        },
        onSetFilterHours: (hours) => {
          setIsOpen(false)
          setFilterHours(hours)
        },
      }),
    [onClearSelection, onJumpToLatest, onNewSession, panes$, setFilterHours],
  )

  const { executeCommand, isExecuting } = useCommandExecutor()
  const {
    filteredSections,
    filteredEntries,
    isLoading,
    error: commandsError,
    registerRecent,
  } = useCommandPaletteData({ localCommands, query })

  const entryIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    filteredEntries.forEach((entry, index) => {
      map.set(entry.id, index)
    })
    return map
  }, [filteredEntries])

  const visibleSections = useMemo(
    () => filteredSections.filter((section) => section.categories.length > 0),
    [filteredSections],
  )

  const open = useCallback(() => {
    previousActiveElement.current = document.activeElement
    setQuery('')
    setSelectedIndex(0)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    if (previousActiveElement.current instanceof HTMLElement) {
      previousActiveElement.current.focus()
    }
  }, [])

  const isEntryDisabled = useCallback(
    (entry: CommandPaletteEntry) => entry.command.source === 'sdk' && !selectedSessionKey,
    [selectedSessionKey],
  )

  const handleExecuteCommand = useCallback(
    async (entry: CommandPaletteEntry) => {
      if (isExecuting || isEntryDisabled(entry)) {
        return
      }
      const result = await executeCommand({
        command: entry.command,
        sessionKey: selectedSessionKey ?? undefined,
      })
      if (result.status === 'success') {
        registerRecent(entry.id)
        close()
      }
    },
    [close, executeCommand, isEntryDisabled, isExecuting, registerRecent, selectedSessionKey],
  )

  const emptyStateMessage = useMemo(() => {
    if (filteredEntries.length === 0 && isLoading) {
      return 'Loading commands...'
    }
    if (filteredEntries.length === 0 && commandsError) {
      return commandsError
    }
    if (filteredEntries.length === 0) {
      return query ? 'No commands found.' : 'No commands available.'
    }
    return null
  }, [commandsError, filteredEntries.length, isLoading, query])

  const executeSelected = useCallback(() => {
    const entry = filteredEntries[selectedIndex]
    if (entry && !isEntryDisabled(entry)) {
      void handleExecuteCommand(entry)
    }
  }, [filteredEntries, handleExecuteCommand, isEntryDisabled, selectedIndex])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(filteredEntries.length - 1, 0)))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        executeSelected()
        return
      }
    },
    [close, executeSelected, filteredEntries.length],
  )

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Reset selection when query changes
  const prevQuery = useRef(query)
  if (prevQuery.current !== query) {
    prevQuery.current = query
    if (selectedIndex !== 0) {
      setSelectedIndex(0)
    }
  }

  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) {
        return
      }

      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      if (!isShortcut) {
        return
      }

      if (!isOpen && !canTriggerGlobalShortcuts()) {
        return
      }

      event.preventDefault()
      if (isOpen) {
        close()
      } else {
        open()
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [canTriggerGlobalShortcuts, close, isOpen, open])

  if (!isOpen) {
    return null
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          open()
        } else {
          close()
        }
      }}
    >
      <DialogContent
        aria-label="Command palette"
        overlayClassName="bg-black/50"
        modalClassName="max-w-md p-0 top-[20vh] -translate-y-0"
        showCloseButton={false}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Command className="h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={setQuery}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1"
            inputClassName="h-8 border-0 bg-transparent px-0 py-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <kbd className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-[300px] overflow-auto p-1">
          {emptyStateMessage ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyStateMessage}
            </div>
          ) : (
            visibleSections.map((section) => (
              <div key={section.id} className="pb-1">
                <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </div>
                {section.categories.map((category) => (
                  <div key={`${section.id}-${category.id}`}>
                    {section.categories.length > 1 ? (
                      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/80">
                        {category.label}
                      </div>
                    ) : null}
                    {category.entries.map((entry) => {
                      const entryIndex = entryIndexMap.get(entry.id) ?? 0
                      const isDisabled = isEntryDisabled(entry)
                      const noSessionHint = isDisabled
                        ? 'Select a session to run this command.'
                        : null
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (isDisabled) {
                              return
                            }
                            void handleExecuteCommand(entry)
                          }}
                          onMouseEnter={() => {
                            if (!isDisabled) {
                              setSelectedIndex(entryIndex)
                            }
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground',
                            isDisabled
                              ? 'cursor-not-allowed opacity-50'
                              : entryIndex === selectedIndex
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-secondary/50',
                          )}
                        >
                          <span className="text-muted-foreground">
                            {resolveCommandIcon(entry.icon)}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col text-left">
                            <span className="truncate">{entry.label}</span>
                            {entry.description ? (
                              <span className="text-[10px] text-muted-foreground">
                                {entry.description}
                              </span>
                            ) : null}
                            {noSessionHint ? (
                              <span className="text-[10px] text-muted-foreground">
                                {noSessionHint}
                              </span>
                            ) : null}
                          </span>
                          {entry.shortcut ? (
                            <kbd className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {entry.shortcut}
                            </kbd>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
