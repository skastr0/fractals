'use client'

import { ReactFlowProvider } from '@xyflow/react'
import { AppShell } from '@/components/layout'

export default function Home() {
  return (
    <ReactFlowProvider>
      <AppShell />
    </ReactFlowProvider>
  )
}
