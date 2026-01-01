'use client'

import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

interface TypewriterEffectProps {
  text: string
  isStreaming?: boolean
  className?: string
  cursorClassName?: string
  render?: (text: string) => ReactNode
}

const CURSOR_STYLE = { animation: 'blink 1s step-start infinite' } as const

export function TypewriterEffect({
  text,
  isStreaming = false,
  className,
  cursorClassName,
  render,
}: TypewriterEffectProps) {
  const [displayText, setDisplayText] = useState(text)

  useEffect(() => {
    if (!isStreaming) {
      setDisplayText(text)
      return
    }

    setDisplayText((prev) => (text.length < prev.length ? text : prev))

    const interval = window.setInterval(() => {
      setDisplayText((prev) => {
        if (prev.length >= text.length) {
          return prev
        }

        const remaining = text.length - prev.length
        const step = remaining > 12 ? Math.ceil(remaining / 6) : 1
        return text.slice(0, prev.length + step)
      })
    }, 16)

    return () => window.clearInterval(interval)
  }, [text, isStreaming])

  const content = useMemo(() => (render ? render(displayText) : displayText), [displayText, render])

  return (
    <div className={cn('relative', className)}>
      {content}
      {isStreaming ? (
        <span
          className={cn('ml-1 inline-block h-4 w-0.5 bg-primary', cursorClassName)}
          style={CURSOR_STYLE}
        />
      ) : null}
    </div>
  )
}
