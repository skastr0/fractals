'use client'

import { useCallback, useEffect, useState } from 'react'

export interface ContextMenuPosition {
  x: number
  y: number
}

export function useContextMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 })

  const open = useCallback((nextPosition: ContextMenuPosition) => {
    setPosition(nextPosition)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }

    const handlePointerDown = () => {
      close()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointerDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [close, isOpen])

  return {
    isOpen,
    position,
    open,
    close,
  }
}
