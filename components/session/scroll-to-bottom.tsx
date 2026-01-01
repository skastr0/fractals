'use client'

import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ScrollToBottomProps {
  onClick: () => void
}

export function ScrollToBottom({ onClick }: ScrollToBottomProps) {
  return (
    <Button
      variant="secondary"
      size="sm"
      className="absolute bottom-24 left-1/2 -translate-x-1/2 shadow-lg"
      onPress={onClick}
    >
      <ChevronDown className="h-4 w-4" />
      Scroll to bottom
    </Button>
  )
}
