'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { createMarkdownComponents } from '@/components/ui/markdown'
import { cn } from '@/lib/utils'

interface StreamingMarkdownProps {
  content: string
  className?: string
  /** Hints that content is actively streaming - enables block repair */
  isStreaming?: boolean
}

const STREAMING_THROTTLE_MS = 120

/**
 * Repair incomplete markdown for valid parsing during streaming.
 *
 * Handles:
 * - Unclosed code fences (odd number of ```)
 * - Unclosed inline code (odd number of `)
 * - Unclosed bold/italic markers
 */
function repairMarkdown(content: string, isStreaming: boolean): string {
  if (!isStreaming || !content) {
    return content
  }

  let repaired = content

  // Count code fences (``` at start of line or preceded by newline)
  // We need to be careful: ``` inside inline code shouldn't count
  const fenceMatches = repaired.match(/(?:^|\n)```/g)
  const fenceCount = fenceMatches?.length ?? 0

  // If odd number of fences, we have an unclosed code block
  if (fenceCount % 2 === 1) {
    // Append closing fence
    repaired = `${repaired}\n\`\`\``
  }

  // For inline backticks, we need to be smarter
  // Only repair if we're NOT inside a code fence block
  if (fenceCount % 2 === 0) {
    // Count backticks that are likely inline code (not part of fence)
    // This is a simplified heuristic: count single/double backticks not part of ```
    const withoutFences = repaired.replace(/```[\s\S]*?```/g, '')
    const backtickCount = (withoutFences.match(/`/g) ?? []).length

    if (backtickCount % 2 === 1) {
      // Find the last unclosed backtick and close it
      repaired = `${repaired}\``
    }
  }

  return repaired
}

/**
 * Markdown renderer optimized for streaming content.
 *
 * Key features:
 * - Block repair: Temporarily closes unclosed code blocks/inline code for valid parsing
 * - Memoization: Only re-parses when content actually changes
 * - Layout stability: Repaired content prevents parse errors that cause layout jank
 *
 * Use this for content that updates incrementally (like streaming LLM responses).
 * For static content, use the regular `Markdown` component.
 */
export const StreamingMarkdown = memo(
  function StreamingMarkdown({ content, className, isStreaming = false }: StreamingMarkdownProps) {
    const [throttledContent, setThrottledContent] = useState(content)
    const latestContentRef = useRef(content)
    const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
      latestContentRef.current = content

      if (!isStreaming) {
        if (throttleTimerRef.current) {
          clearTimeout(throttleTimerRef.current)
          throttleTimerRef.current = null
        }
        setThrottledContent(content)
        return
      }

      if (throttleTimerRef.current) {
        return
      }

      throttleTimerRef.current = setTimeout(() => {
        throttleTimerRef.current = null
        setThrottledContent(latestContentRef.current)
      }, STREAMING_THROTTLE_MS)
    }, [content, isStreaming])

    useEffect(() => {
      return () => {
        if (throttleTimerRef.current) {
          clearTimeout(throttleTimerRef.current)
          throttleTimerRef.current = null
        }
      }
    }, [])

    // Memoize the repaired content
    // Only recompute when throttled content or streaming state changes
    const repairedContent = useMemo(() => {
      return repairMarkdown(throttledContent, isStreaming)
    }, [throttledContent, isStreaming])

    const markdownComponents = useMemo(
      () => createMarkdownComponents({ enableHighlight: !isStreaming }),
      [isStreaming],
    )

    // Early return for empty content
    if (!repairedContent.trim()) {
      return null
    }

    return (
      <div
        className={cn(
          'prose prose-sm max-w-none text-foreground/90',
          'prose-zinc dark:prose-invert',
          'prose-headings:scroll-mt-20 prose-headings:text-foreground',
          'prose-pre:p-0 prose-pre:bg-transparent',
          'prose-code:before:content-none prose-code:after:content-none',
          className,
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {repairedContent}
        </ReactMarkdown>
      </div>
    )
  },
  // Custom comparison: only re-render if content or streaming state changed
  (prevProps, nextProps) => {
    return (
      prevProps.content === nextProps.content &&
      prevProps.isStreaming === nextProps.isStreaming &&
      prevProps.className === nextProps.className
    )
  },
)
