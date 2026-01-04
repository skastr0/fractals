'use client'

import fuzzysort from 'fuzzysort'
import { ChevronDown, Search } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Button as AriaButton, Dialog, DialogTrigger, Popover } from 'react-aria-components'

import type { ModelInfo } from '@/hooks/useSessionOptions'

interface ModelPickerProps {
  recentModels: ModelInfo[]
  allModels: ModelInfo[]
  selectedModel: ModelInfo | null
  onSelect: (model: ModelInfo) => void
  isDisabled?: boolean
}

interface ModelOption {
  model: ModelInfo
  category: string
}

export function ModelPicker({
  recentModels,
  allModels,
  selectedModel,
  onSelect,
  isDisabled,
}: ModelPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Group all models by provider for display
  const modelsByProvider = useMemo(() => {
    const grouped = new Map<string, ModelInfo[]>()
    for (const model of allModels) {
      const existing = grouped.get(model.providerName) ?? []
      existing.push(model)
      grouped.set(model.providerName, existing)
    }
    // Sort providers alphabetically
    return new Map([...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)))
  }, [allModels])

  // Build searchable options with categories
  const searchableOptions = useMemo(() => {
    const options: ModelOption[] = []

    // Add recent models
    for (const model of recentModels) {
      options.push({ model, category: 'Recent' })
    }

    // Add all models by provider
    for (const [provider, providerModels] of modelsByProvider) {
      for (const model of providerModels) {
        options.push({ model, category: provider })
      }
    }

    return options
  }, [recentModels, modelsByProvider])

  // Filter options with fuzzy search
  const filteredOptions = useMemo(() => {
    if (!query.trim()) {
      // No query - return structured sections
      return searchableOptions
    }

    // Fuzzy search on model name and provider name
    const results = fuzzysort.go(query, searchableOptions, {
      keys: [(opt) => opt.model.name, (opt) => opt.model.providerName],
      threshold: -10000, // Be very permissive
    })

    return results.map((r) => r.obj)
  }, [query, searchableOptions])

  // Group filtered options by category for rendering
  const groupedOptions = useMemo(() => {
    const grouped = new Map<string, ModelInfo[]>()
    for (const opt of filteredOptions) {
      const existing = grouped.get(opt.category) ?? []
      existing.push(opt.model)
      grouped.set(opt.category, existing)
    }
    return grouped
  }, [filteredOptions])

  const handleSelect = useCallback(
    (model: ModelInfo) => {
      onSelect(model)
      setIsOpen(false)
      setQuery('')
    },
    [onSelect],
  )

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open)
    if (open) {
      // Focus input when opening
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setQuery('')
    }
  }, [])

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={handleOpenChange}>
      <AriaButton
        isDisabled={isDisabled}
        className="flex h-7 items-center gap-1.5 rounded border border-border bg-background px-2 text-xs text-foreground hover:bg-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50"
      >
        <span className="max-w-[140px] truncate">{selectedModel?.name ?? 'Select model'}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
      </AriaButton>
      <Popover
        placement="bottom start"
        className="w-[320px] overflow-hidden rounded border border-border bg-background shadow-lg"
      >
        <Dialog className="outline-none">
          {/* Search Input */}
          <div className="border-b border-border p-2">
            <div className="flex items-center gap-2 rounded border border-border bg-secondary/30 px-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search models..."
                className="h-7 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-[300px] overflow-y-auto p-1">
            {groupedOptions.size === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                No models found
              </div>
            ) : (
              Array.from(groupedOptions.entries()).map(([category, categoryModels]) => (
                <div key={category}>
                  {/* Category Header */}
                  <div className="sticky top-0 bg-background px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {category}
                  </div>
                  {/* Category Items */}
                  {categoryModels.map((model) => {
                    const isSelected =
                      selectedModel?.providerId === model.providerId &&
                      selectedModel?.id === model.id

                    return (
                      <button
                        key={`${model.providerId}/${model.id}`}
                        type="button"
                        onClick={() => handleSelect(model)}
                        className={`flex w-full cursor-pointer select-none flex-col gap-0.5 rounded px-2 py-1.5 text-left text-xs outline-none hover:bg-accent focus:bg-accent ${
                          isSelected ? 'bg-primary/10' : ''
                        }`}
                      >
                        <span className="font-medium">{model.name}</span>
                        {category !== model.providerName && (
                          <span className="text-[10px] text-muted-foreground">
                            {model.providerName}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}
