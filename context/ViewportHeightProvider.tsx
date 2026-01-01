'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

const DEFAULT_APP_HEIGHT = '100vh'

export function ViewportHeightProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const applyHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight
      const value = height > 0 ? `${height}px` : DEFAULT_APP_HEIGHT
      document.documentElement.style.setProperty('--app-height', value)
    }

    applyHeight()

    window.addEventListener('resize', applyHeight)
    window.addEventListener('orientationchange', applyHeight)
    window.visualViewport?.addEventListener('resize', applyHeight)

    return () => {
      window.removeEventListener('resize', applyHeight)
      window.removeEventListener('orientationchange', applyHeight)
      window.visualViewport?.removeEventListener('resize', applyHeight)
    }
  }, [])

  return <>{children}</>
}
