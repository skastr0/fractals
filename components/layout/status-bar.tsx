'use client'

import { ConnectionStatus } from '@/components/connection-status'

export function StatusBar() {
  return (
    <footer className="h-8 border-t border-border bg-background/95">
      <div className="flex h-full items-center px-4">
        <ConnectionStatus />
      </div>
    </footer>
  )
}
