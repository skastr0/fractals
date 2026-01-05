'use client'

import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ScrollToBottomProps {
  onClick: () => void
}

export function ScrollToBottom({ onClick }: ScrollToBottomProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-24">
      <Button
        variant="secondary"
        size="sm"
        className="pointer-events-auto shadow-lg"
        onPress={onClick}
      >
        <ChevronDown className="h-4 w-4" />
        Scroll to bottom
      </Button>
    </div>
  )
}
