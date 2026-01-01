'use client'

import { memo } from 'react'

import { Markdown } from '@/components/ui/markdown'
import type { TextPart } from '@/lib/opencode'
import { cn } from '@/lib/utils'

import { TypewriterEffect } from '../typewriter-effect'

interface TextPartRendererProps {
  part: TextPart
}

export const TextPartRenderer = memo(function TextPartRenderer({ part }: TextPartRendererProps) {
  if (part.ignored) {
    return null
  }

  const isStreaming = !part.time?.end

  return (
    <div
      className={cn(
        'text-sm leading-relaxed',
        part.synthetic ? 'text-muted-foreground italic' : '',
      )}
    >
      <TypewriterEffect
        text={part.text}
        isStreaming={isStreaming}
        render={(value) => <Markdown content={value} />}
      />
    </div>
  )
})
