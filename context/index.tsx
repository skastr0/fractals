'use client'

import type { ReactNode } from 'react'

import { ErrorBoundary } from '@/components/error-boundary'

import { FocusManagerProvider } from './FocusManagerProvider'
import { OpenCodeProvider } from './OpenCodeProvider'
import { PanesProvider } from './PanesProvider'
import { ProjectProvider } from './ProjectProvider'
import { SessionFilterProvider } from './SessionFilterProvider'
import { SyncProvider } from './SyncProvider'
import { ViewportHeightProvider } from './ViewportHeightProvider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ViewportHeightProvider>
        <OpenCodeProvider>
          <ProjectProvider>
            <SyncProvider>
              <SessionFilterProvider>
                <PanesProvider>
                  <FocusManagerProvider>{children}</FocusManagerProvider>
                </PanesProvider>
              </SessionFilterProvider>
            </SyncProvider>
          </ProjectProvider>
        </OpenCodeProvider>
      </ViewportHeightProvider>
    </ErrorBoundary>
  )
}

export type { FocusArea, FocusContext, FocusManagerContextValue } from './FocusManagerProvider'
export { FocusManagerProvider, useFocusManager } from './FocusManagerProvider'
export type { OpenCodeContextValue } from './OpenCodeProvider'
export { OpenCodeProvider, useOpenCode } from './OpenCodeProvider'
export type { Pane, PanesContextValue } from './PanesProvider'
export { PanesProvider, usePanes } from './PanesProvider'
export type { ProjectContextValue } from './ProjectProvider'
export { ProjectProvider, useProject } from './ProjectProvider'
export { SessionFilterProvider, useSessionFilter } from './SessionFilterProvider'
export type { SyncContextValue, SyncState } from './SyncProvider'
export { SyncProvider, useSync } from './SyncProvider'
export { ViewportHeightProvider } from './ViewportHeightProvider'
